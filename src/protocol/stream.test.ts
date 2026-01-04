import { describe, expect, it } from "bun:test";
import type { Packet } from "./packet-framer.js";
import { encodeRequestResponseHeader } from "./request-response-header.js";
import { END_RESPONSE_TYPE, readUntilEndResponse } from "./stream.js";

function makePacket(type: number, dejavu: number, payload: Uint8Array): Packet {
  const headerBytes = encodeRequestResponseHeader({
    size: 8 + payload.byteLength,
    type,
    dejavu,
  });
  const header = {
    size: (headerBytes[0] ?? 0) | ((headerBytes[1] ?? 0) << 8) | ((headerBytes[2] ?? 0) << 16),
    type: headerBytes[3] ?? 0,
    dejavu: new DataView(
      headerBytes.buffer,
      headerBytes.byteOffset,
      headerBytes.byteLength,
    ).getUint32(4, true),
  };
  return { header, payload };
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

describe("readUntilEndResponse", () => {
  it("yields packets until END_RESPONSE then stops (excluding end by default)", async () => {
    async function* source() {
      yield makePacket(24, 1, Uint8Array.from([1]));
      yield makePacket(24, 2, Uint8Array.from([2]));
      yield makePacket(END_RESPONSE_TYPE, 3, new Uint8Array(0));
      yield makePacket(24, 4, Uint8Array.from([9])); // should never be seen
    }

    const packets = await collect(readUntilEndResponse(source()));
    expect(packets.map((p) => p.header.type)).toEqual([24, 24]);
    const packet0 = packets[0];
    const packet1 = packets[1];
    if (!packet0 || !packet1) throw new Error("Expected two packets");
    expect([...packet0.payload]).toEqual([1]);
    expect([...packet1.payload]).toEqual([2]);
  });

  it("can include END_RESPONSE when requested", async () => {
    async function* source() {
      yield makePacket(24, 1, Uint8Array.from([1]));
      yield makePacket(END_RESPONSE_TYPE, 3, new Uint8Array(0));
    }

    const packets = await collect(readUntilEndResponse(source(), { includeEnd: true }));
    expect(packets.map((p) => p.header.type)).toEqual([24, END_RESPONSE_TYPE]);
  });

  it("throws if EOF occurs before END_RESPONSE (default)", async () => {
    async function* source() {
      yield makePacket(24, 1, Uint8Array.from([1]));
    }

    await expect(collect(readUntilEndResponse(source()))).rejects.toBeTruthy();
  });

  it("allows EOF before END_RESPONSE when allowEof is true", async () => {
    async function* source() {
      yield makePacket(24, 1, Uint8Array.from([1]));
    }

    const packets = await collect(readUntilEndResponse(source(), { allowEof: true }));
    expect(packets.map((p) => p.header.type)).toEqual([24]);
  });
});
