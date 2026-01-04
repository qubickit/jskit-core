import net from "node:net";
import { AsyncQueue } from "./async-queue.js";
import type { Transport } from "./transport.js";

export type CreateTcpTransportOptions = Readonly<{
  host: string;
  port: number;
  signal?: AbortSignal;
}>;

function toAbortError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

export async function createTcpTransport(options: CreateTcpTransportOptions): Promise<Transport> {
  const socket = new net.Socket();
  socket.setNoDelay(true);

  const queue = new AsyncQueue<Uint8Array>();

  const onData = (chunk: Buffer) => {
    queue.push(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
  };
  const onError = (err: unknown) => {
    queue.error(err);
  };
  const onClose = () => {
    queue.close();
  };

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  const abortListener = () => {
    const err = toAbortError(options.signal?.reason);
    socket.destroy(err);
    queue.error(err);
  };
  if (options.signal) {
    if (options.signal.aborted) {
      abortListener();
    } else {
      options.signal.addEventListener("abort", abortListener, { once: true });
    }
  }

  await new Promise<void>((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onConnectError = (err: unknown) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("error", onConnectError);
    };
    socket.once("connect", onConnect);
    socket.once("error", onConnectError);
    socket.connect(options.port, options.host);
  });

  const write = (bytes: Uint8Array): Promise<void> => {
    if (socket.destroyed) {
      return Promise.reject(new Error("Socket is closed"));
    }

    return new Promise<void>((resolve, reject) => {
      let flushed = false;
      let drained = false;

      const finalizeIfDone = () => {
        if (flushed && drained) {
          cleanup();
          resolve();
        }
      };

      const onDrain = () => {
        drained = true;
        finalizeIfDone();
      };

      const onWrite = (err?: Error | null) => {
        if (err) {
          cleanup();
          reject(err);
          return;
        }
        flushed = true;
        finalizeIfDone();
      };

      const cleanup = () => {
        socket.off("drain", onDrain);
      };

      const ok = socket.write(bytes, onWrite);
      if (ok) {
        drained = true;
        finalizeIfDone();
      } else {
        socket.on("drain", onDrain);
      }
    });
  };

  const close = async (): Promise<void> => {
    if (options.signal) {
      options.signal.removeEventListener("abort", abortListener);
    }

    if (socket.destroyed) {
      queue.close();
      return;
    }

    await new Promise<void>((resolve) => {
      socket.end(() => resolve());
    });
  };

  return {
    read: () => queue,
    write,
    close,
  };
}
