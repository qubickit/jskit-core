# Transports

Transports implement:

```ts
export type Transport = {
  read(): AsyncIterable<Uint8Array>;
  write(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
};
```

## Node TCP transport

- `createTcpTransport({ host, port, signal? })`

## Browser/WebSocket bridge

If you have a WebSocket server that forwards binary frames to/from a node TCP connection:

- `createBridgeTransport({ url, signal?, WebSocketImpl? })`

`WebSocketImpl` exists so you can supply your own implementation in runtimes that don’t provide a global `WebSocket`.

