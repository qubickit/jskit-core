import { describe, expect, it } from "bun:test";
import type { BridgeWebSocketConstructor } from "./bridge.js";
import { createBridgeTransport } from "./bridge.js";

type Listener = (event: unknown) => void;

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = FakeWebSocket.CONNECTING;
  readonly OPEN = FakeWebSocket.OPEN;
  readonly CLOSING = FakeWebSocket.CLOSING;
  readonly CLOSED = FakeWebSocket.CLOSED;

  readyState = FakeWebSocket.CONNECTING;
  binaryType = "arraybuffer";
  readonly sent: Uint8Array[] = [];
  readonly listeners = new Map<string, Listener[]>();

  constructor(public readonly url: string) {
    queueMicrotask(() => this.open());
  }

  addEventListener(type: string, listener: Listener, options?: { once?: boolean }) {
    const wrapper: Listener = options?.once
      ? (e) => {
          this.removeEventListener(type, wrapper);
          listener(e);
        }
      : listener;
    const list = this.listeners.get(type) ?? [];
    list.push(wrapper);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: Listener) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((l) => l !== listener),
    );
  }

  private emit(type: string, event: unknown) {
    const list = this.listeners.get(type) ?? [];
    for (const l of list) l(event);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.emit("open", {});
  }

  message(data: Uint8Array | ArrayBuffer) {
    this.emit("message", { data });
  }

  send(data: Uint8Array) {
    this.sent.push(new Uint8Array(data));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close", {});
  }
}

describe("bridge transport", () => {
  it("writes websocket binary messages", async () => {
    let instance: FakeWebSocket | undefined;
    const WebSocketImpl = class extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        instance = this;
      }
    };

    const transport = await createBridgeTransport({
      url: "ws://example",
      WebSocketImpl: WebSocketImpl as unknown as BridgeWebSocketConstructor,
    });

    await transport.write(Uint8Array.from([1, 2, 3]));
    expect(instance?.sent).toEqual([Uint8Array.from([1, 2, 3])]);

    await transport.close();
  });

  it("yields inbound messages", async () => {
    let instance: FakeWebSocket | undefined;
    const WebSocketImpl = class extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        instance = this;
      }
    };

    const transport = await createBridgeTransport({
      url: "ws://example",
      WebSocketImpl: WebSocketImpl as unknown as BridgeWebSocketConstructor,
    });
    const iter = transport.read()[Symbol.asyncIterator]();

    instance?.message(Uint8Array.from([9, 8, 7]));
    const msg = await iter.next();
    expect(msg.done).toBe(false);
    expect(msg.value).toEqual(Uint8Array.from([9, 8, 7]));

    await transport.close();
  });
});
