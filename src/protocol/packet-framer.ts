import type { RequestResponseHeaderFields } from "./request-response-header.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";

export type Packet = Readonly<{
  header: RequestResponseHeaderFields;
  payload: Uint8Array; // excludes the 8-byte header
}>;

export type PacketFramer = Readonly<{
  push(chunk: Uint8Array): void;
  read(): Packet[];
  bufferedBytes(): number;
}>;

function concatInto(
  target: Uint8Array,
  targetOffset: number,
  source: Uint8Array,
  sourceOffset: number,
  length: number,
) {
  target.set(source.subarray(sourceOffset, sourceOffset + length), targetOffset);
}

export function createPacketFramer(): PacketFramer {
  const chunks: Uint8Array[] = [];
  let buffered = 0;
  let headOffset = 0;

  const peek = (length: number): Uint8Array => {
    const out = new Uint8Array(length);
    let remaining = length;
    let outOffset = 0;

    for (let i = 0; i < chunks.length && remaining > 0; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      const start = i === 0 ? headOffset : 0;
      const available = chunk.byteLength - start;
      const take = Math.min(available, remaining);
      concatInto(out, outOffset, chunk, start, take);
      outOffset += take;
      remaining -= take;
    }

    return out;
  };

  const consume = (length: number): Uint8Array => {
    if (length > buffered) {
      throw new RangeError("Cannot consume more bytes than buffered");
    }

    const out = new Uint8Array(length);
    let remaining = length;
    let outOffset = 0;

    while (remaining > 0) {
      const chunk = chunks[0];
      if (!chunk) break;

      const start = headOffset;
      const available = chunk.byteLength - start;
      const take = Math.min(available, remaining);
      concatInto(out, outOffset, chunk, start, take);
      outOffset += take;
      remaining -= take;

      headOffset += take;
      buffered -= take;

      if (headOffset >= chunk.byteLength) {
        chunks.shift();
        headOffset = 0;
      }
    }

    return out;
  };

  const read = (): Packet[] => {
    const packets: Packet[] = [];

    while (true) {
      if (buffered < 8) break;

      const headerBytes = peek(8);
      const header = decodeRequestResponseHeader(headerBytes);

      if (header.size < 8) {
        throw new RangeError(`Invalid packet header: size must be >= 8, got ${header.size}`);
      }

      if (buffered < header.size) break;

      const packetBytes = consume(header.size);
      packets.push({
        header,
        payload: packetBytes.subarray(8),
      });
    }

    return packets;
  };

  const push = (chunk: Uint8Array) => {
    if (!(chunk instanceof Uint8Array)) {
      throw new TypeError("chunk must be a Uint8Array");
    }
    if (chunk.byteLength === 0) return;
    chunks.push(chunk);
    buffered += chunk.byteLength;
  };

  return {
    push,
    read,
    bufferedBytes: () => buffered,
  };
}
