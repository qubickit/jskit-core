import { describe, expect, it } from "bun:test";
import {
  MAX_PACKET_SIZE,
  decodeRequestResponseHeader,
  encodeRequestResponseHeader,
} from "./request-response-header.js";

describe("RequestResponseHeader", () => {
  it("encodes and decodes roundtrip", () => {
    const encoded = encodeRequestResponseHeader({ size: 8, type: 24, dejavu: 0 });
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBe(8);

    const decoded = decodeRequestResponseHeader(encoded);
    expect(decoded).toEqual({ size: 8, type: 24, dejavu: 0 });
  });

  it("encodes max size", () => {
    const encoded = encodeRequestResponseHeader({ size: MAX_PACKET_SIZE, type: 255, dejavu: 0xffffffff });
    const decoded = decodeRequestResponseHeader(encoded);
    expect(decoded.size).toBe(MAX_PACKET_SIZE);
    expect(decoded.type).toBe(255);
    expect(decoded.dejavu).toBe(0xffffffff);
  });

  it("rejects invalid size", () => {
    expect(() => encodeRequestResponseHeader({ size: 0, type: 0, dejavu: 0 })).toThrow();
    expect(() => encodeRequestResponseHeader({ size: MAX_PACKET_SIZE + 1, type: 0, dejavu: 0 })).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() => encodeRequestResponseHeader({ size: 8, type: -1, dejavu: 0 })).toThrow();
    expect(() => encodeRequestResponseHeader({ size: 8, type: 256, dejavu: 0 })).toThrow();
  });

  it("rejects invalid dejavu", () => {
    expect(() => encodeRequestResponseHeader({ size: 8, type: 0, dejavu: -1 })).toThrow();
    expect(() => encodeRequestResponseHeader({ size: 8, type: 0, dejavu: 0x1_0000_0000 })).toThrow();
  });

  it("rejects decode of short buffer", () => {
    expect(() => decodeRequestResponseHeader(new Uint8Array(7))).toThrow();
  });

  it("rejects decode when size is 0", () => {
    const b = new Uint8Array(8);
    b[3] = 1;
    expect(() => decodeRequestResponseHeader(b)).toThrow();
  });

  it("property-ish: random roundtrips", () => {
    for (let i = 0; i < 500; i++) {
      const size = 1 + Math.floor(Math.random() * MAX_PACKET_SIZE);
      const type = Math.floor(Math.random() * 256);
      const dejavu = Math.floor(Math.random() * 0x1_0000_0000);
      const encoded = encodeRequestResponseHeader({ size, type, dejavu });
      const decoded = decodeRequestResponseHeader(encoded);
      expect(decoded).toEqual({ size, type, dejavu: dejavu >>> 0 });
    }
  });
});

