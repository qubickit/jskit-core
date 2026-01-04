import { encodeRequestResponseHeader, MAX_PACKET_SIZE } from "./request-response-header.js";

export type EncodeRequestPacketOptions = Readonly<{
  dejavu?: number;
}>;

function randomDejavu(): number {
  // mimic go-node-connector: uint32(rand.Int31()) and ensure non-zero
  let value = 0;

  // Use WebCrypto if available
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const tmp = new Uint32Array(1);
    globalThis.crypto.getRandomValues(tmp);
    value = (tmp[0] ?? 0) & 0x7fffffff;
  } else {
    value = Math.floor(Math.random() * 0x80000000);
  }

  if (value === 0) value = 1;
  return value >>> 0;
}

export function encodeRequestPacket(
  type: number,
  payload: Uint8Array = new Uint8Array(),
  options: EncodeRequestPacketOptions = {},
): Uint8Array {
  if (!Number.isInteger(type) || type < 0 || type > 0xff) {
    throw new RangeError("type must be a uint8");
  }
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError("payload must be a Uint8Array");
  }

  const size = 8 + payload.byteLength;
  if (size > MAX_PACKET_SIZE) {
    throw new RangeError(`packet size cannot exceed ${MAX_PACKET_SIZE}`);
  }

  const dejavu = options.dejavu ?? randomDejavu();
  const header = encodeRequestResponseHeader({ size, type, dejavu });

  const out = new Uint8Array(size);
  out.set(header, 0);
  out.set(payload, 8);
  return out;
}
