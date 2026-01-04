import { afterEach, describe, expect, it } from "bun:test";
import net from "node:net";
import { createTcpTransport } from "./tcp.js";

type ServerHandle = {
  server: net.Server;
  port: number;
};

async function startServer(
  handler: (socket: net.Socket) => void | Promise<void>,
): Promise<ServerHandle> {
  const server = net.createServer((socket) => {
    void handler(socket);
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  return { server, port: Number(address.port) };
}

async function stopServer(handle: ServerHandle) {
  await new Promise<void>((resolve, reject) => {
    handle.server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe("createTcpTransport", () => {
  let handle: ServerHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await stopServer(handle);
      handle = undefined;
    }
  });

  it("reads chunks from the socket", async () => {
    handle = await startServer(async (socket) => {
      socket.write(Uint8Array.from([1, 2, 3]));
      await new Promise((r) => setTimeout(r, 5));
      socket.write(Uint8Array.from([4, 5]));
      socket.end();
    });

    const transport = await createTcpTransport({ host: "127.0.0.1", port: handle.port });

    const received: number[] = [];
    for await (const chunk of transport.read()) {
      received.push(...chunk);
    }

    expect(received).toEqual([1, 2, 3, 4, 5]);
  });

  it("writes to the socket", async () => {
    const received: number[] = [];
    let receivedResolve: (() => void) | undefined;
    const receivedDone = new Promise<void>((resolve) => {
      receivedResolve = resolve;
    });

    handle = await startServer((socket) => {
      socket.on("data", (d) => {
        const bytes =
          typeof d === "string"
            ? new TextEncoder().encode(d)
            : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
        received.push(...bytes);
        receivedResolve?.();
        socket.end();
      });
    });

    const transport = await createTcpTransport({ host: "127.0.0.1", port: handle.port });
    await transport.write(Uint8Array.from([9, 8, 7]));
    await transport.close();

    await receivedDone;
    expect(received).toEqual([9, 8, 7]);
  });

  it("aborts connect with AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createTcpTransport({ host: "127.0.0.1", port: 1, signal: controller.signal }),
    ).rejects.toBeTruthy();
  });
});
