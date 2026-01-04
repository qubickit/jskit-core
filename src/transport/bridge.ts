import { AsyncQueue } from "./async-queue.js";
import type { Transport } from "./transport.js";

export type BridgeWebSocketLike = Readonly<{
  readonly readyState: number;
  readonly CONNECTING: number;
  readonly OPEN: number;
  readonly CLOSING: number;
  readonly CLOSED: number;
  binaryType?: string;

  send(data: Uint8Array): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: "open" | "message" | "error" | "close",
    listener: (event: unknown) => void,
    options?: Readonly<{ once?: boolean }>,
  ): void;
  removeEventListener(
    type: "open" | "message" | "error" | "close",
    listener: (event: unknown) => void,
  ): void;
}>;

export type BridgeWebSocketConstructor = new (url: string) => BridgeWebSocketLike;

export type CreateBridgeTransportOptions = Readonly<{
  url: string;
  signal?: AbortSignal;
  WebSocketImpl?: BridgeWebSocketConstructor;
}>;

function toAbortError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function toUint8ArrayMessage(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  throw new TypeError("WebSocket message must be binary (Uint8Array/ArrayBuffer)");
}

export async function createBridgeTransport(
  options: CreateBridgeTransportOptions,
): Promise<Transport> {
  const WebSocketImpl =
    options.WebSocketImpl ??
    (globalThis as unknown as Readonly<{ WebSocket?: BridgeWebSocketConstructor }>).WebSocket;
  if (!WebSocketImpl) {
    throw new Error(
      "WebSocket implementation not found; pass WebSocketImpl or run in a WebSocket-capable runtime",
    );
  }

  const ws = new WebSocketImpl(options.url);
  if ("binaryType" in ws) {
    try {
      (ws as unknown as { binaryType?: string }).binaryType = "arraybuffer";
    } catch {
      // ignore
    }
  }

  const queue = new AsyncQueue<Uint8Array>();

  const onMessage = (event: unknown) => {
    try {
      const data = (event as { data?: unknown } | null | undefined)?.data;
      queue.push(toUint8ArrayMessage(data));
    } catch (err) {
      queue.error(err);
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  };

  const onError = () => {
    queue.error(new Error("WebSocket error"));
  };

  const onClose = () => {
    queue.close();
  };

  ws.addEventListener("message", onMessage);
  ws.addEventListener("error", onError);
  ws.addEventListener("close", onClose);

  const abortListener = () => {
    const err = toAbortError(options.signal?.reason);
    queue.error(err);
    try {
      ws.close();
    } catch {
      // ignore
    }
  };
  if (options.signal) {
    if (options.signal.aborted) abortListener();
    else options.signal.addEventListener("abort", abortListener, { once: true });
  }

  await new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onOpenError = () => {
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };
    const cleanup = () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onOpenError);
    };

    if (ws.readyState === ws.OPEN) {
      cleanup();
      resolve();
      return;
    }
    if (ws.readyState === ws.CLOSING || ws.readyState === ws.CLOSED) {
      cleanup();
      reject(new Error("WebSocket is closed"));
      return;
    }

    ws.addEventListener("open", onOpen, { once: true });
    ws.addEventListener("error", onOpenError, { once: true });
  });

  const write = async (bytes: Uint8Array): Promise<void> => {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError("bytes must be a Uint8Array");
    }
    if (ws.readyState !== ws.OPEN) {
      throw new Error("WebSocket is not open");
    }
    ws.send(bytes);
  };

  const close = async (): Promise<void> => {
    if (options.signal) options.signal.removeEventListener("abort", abortListener);
    if (ws.readyState === ws.CLOSED) {
      queue.close();
      return;
    }

    await new Promise<void>((resolve) => {
      const onClosed = () => {
        ws.removeEventListener("close", onClosed);
        resolve();
      };
      ws.addEventListener("close", onClosed);
      try {
        ws.close();
      } catch {
        resolve();
      }
    });
  };

  return {
    read: () => queue,
    write,
    close,
  };
}
