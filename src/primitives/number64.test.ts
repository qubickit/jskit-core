import { describe, expect, it } from "bun:test";
import {
  MAX_I64,
  MAX_U64,
  MIN_I64,
  readI64LE,
  readU64LE,
  writeI64LE,
  writeU64LE,
} from "./number64.js";

function randomU64(): bigint {
  const hi = BigInt(Math.floor(Math.random() * 0x1_0000_0000));
  const lo = BigInt(Math.floor(Math.random() * 0x1_0000_0000));
  return (hi << 32n) | lo;
}

function randomI64(): bigint {
  // Generate signed 64 by taking random unsigned then interpreting as signed.
  const u = randomU64();
  return u > MAX_I64 ? u - (1n << 64n) : u;
}

describe("number64", () => {
  it("writes and reads i64 (extremes)", () => {
    const b = new Uint8Array(8);
    writeI64LE(MIN_I64, b, 0);
    expect(readI64LE(b, 0)).toBe(MIN_I64);
    writeI64LE(MAX_I64, b, 0);
    expect(readI64LE(b, 0)).toBe(MAX_I64);
  });

  it("writes and reads u64 (extremes)", () => {
    const b = new Uint8Array(8);
    writeU64LE(0n, b, 0);
    expect(readU64LE(b, 0)).toBe(0n);
    writeU64LE(MAX_U64, b, 0);
    expect(readU64LE(b, 0)).toBe(MAX_U64);
  });

  it("rejects out-of-range values", () => {
    const b = new Uint8Array(8);
    expect(() => writeI64LE(MIN_I64 - 1n, b, 0)).toThrow();
    expect(() => writeI64LE(MAX_I64 + 1n, b, 0)).toThrow();
    expect(() => writeU64LE(-1n, b, 0)).toThrow();
    expect(() => writeU64LE(MAX_U64 + 1n, b, 0)).toThrow();
  });

  it("rejects out-of-bounds offsets", () => {
    const b = new Uint8Array(8);
    expect(() => readI64LE(b, 1)).toThrow();
    expect(() => readU64LE(b, 1)).toThrow();
    expect(() => writeI64LE(0n, b, 1)).toThrow();
    expect(() => writeU64LE(0n, b, 1)).toThrow();
  });

  it("property-ish: random roundtrips", () => {
    for (let i = 0; i < 500; i++) {
      const b = new Uint8Array(32);
      const u = randomU64();
      const s = randomI64();

      writeU64LE(u, b, 8);
      writeI64LE(s, b, 16);

      expect(readU64LE(b, 8)).toBe(u);
      expect(readI64LE(b, 16)).toBe(s);
    }
  });
});
