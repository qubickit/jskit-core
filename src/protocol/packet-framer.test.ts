import { describe, expect, it } from "bun:test";
import { createPacketFramer } from "./packet-framer.js";
import { encodeRequestResponseHeader } from "./request-response-header.js";

function makePacket(type: number, dejavu: number, payload: Uint8Array): Uint8Array {
  const header = encodeRequestResponseHeader({
    size: 8 + payload.byteLength,
    type,
    dejavu,
  });
  const out = new Uint8Array(header.byteLength + payload.byteLength);
  out.set(header, 0);
  out.set(payload, 8);
  return out;
}

describe("createPacketFramer", () => {
  it("yields nothing with insufficient header bytes", () => {
    const framer = createPacketFramer();
    framer.push(Uint8Array.from([1, 2, 3]));
    expect(framer.read()).toEqual([]);
  });

  it("parses a complete packet from a single chunk", () => {
    const framer = createPacketFramer();
    const payload = Uint8Array.from([9, 8, 7]);
    framer.push(makePacket(24, 0, payload));

    const packets = framer.read();
    expect(packets.length).toBe(1);
    const packet0 = packets[0];
    if (!packet0) throw new Error("Expected first packet");
    expect(packet0.header).toEqual({ size: 11, type: 24, dejavu: 0 });
    expect([...packet0.payload]).toEqual([9, 8, 7]);
    expect(framer.bufferedBytes()).toBe(0);
  });

  it("parses multiple packets from a single chunk", () => {
    const framer = createPacketFramer();
    const a = makePacket(27, 1, new Uint8Array(0));
    const b = makePacket(28, 2, Uint8Array.from([1]));
    const combined = new Uint8Array(a.length + b.length);
    combined.set(a, 0);
    combined.set(b, a.length);

    framer.push(combined);

    const packets = framer.read();
    expect(packets.length).toBe(2);
    const packet0 = packets[0];
    const packet1 = packets[1];
    if (!packet0 || !packet1) throw new Error("Expected two packets");
    expect(packet0.header.type).toBe(27);
    expect(packet0.payload.byteLength).toBe(0);
    expect(packet1.header.type).toBe(28);
    expect([...packet1.payload]).toEqual([1]);
  });

  it("handles header split across chunks", () => {
    const framer = createPacketFramer();
    const payload = Uint8Array.from([1, 2, 3, 4]);
    const packet = makePacket(31, 123, payload);

    framer.push(packet.subarray(0, 2));
    expect(framer.read()).toEqual([]);

    framer.push(packet.subarray(2, 8));
    expect(framer.read()).toEqual([]);

    framer.push(packet.subarray(8));
    const packets = framer.read();
    expect(packets.length).toBe(1);
    const packet0 = packets[0];
    if (!packet0) throw new Error("Expected first packet");
    expect(packet0.header).toEqual({ size: 12, type: 31, dejavu: 123 });
    expect([...packet0.payload]).toEqual([1, 2, 3, 4]);
  });

  it("handles payload split across chunks", () => {
    const framer = createPacketFramer();
    const payload = Uint8Array.from([5, 6, 7, 8, 9]);
    const packet = makePacket(16, 999, payload);

    framer.push(packet.subarray(0, 10));
    expect(framer.read()).toEqual([]);

    framer.push(packet.subarray(10));
    const packets = framer.read();
    expect(packets.length).toBe(1);
    const packet0 = packets[0];
    if (!packet0) throw new Error("Expected first packet");
    expect([...packet0.payload]).toEqual([5, 6, 7, 8, 9]);
  });

  it("throws on invalid packet size (<8)", () => {
    const framer = createPacketFramer();
    const badHeader = encodeRequestResponseHeader({ size: 1, type: 1, dejavu: 0 });
    framer.push(badHeader);
    expect(() => framer.read()).toThrow();
  });
});
