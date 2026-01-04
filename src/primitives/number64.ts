export const MIN_I64 = -(1n << 63n);
export const MAX_I64 = (1n << 63n) - 1n;
export const MAX_U64 = (1n << 64n) - 1n;

function assertIsUint8Array(value: unknown, name: string): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
}

function assertSafeOffset(bytes: Uint8Array, offset: number, length: number) {
  if (!Number.isInteger(offset)) {
    throw new TypeError("offset must be an integer");
  }
  if (offset < 0) {
    throw new RangeError("offset must be >= 0");
  }
  if (offset + length > bytes.byteLength) {
    throw new RangeError("Not enough bytes available at offset");
  }
}

function assertBigIntInRange(value: bigint, min: bigint, max: bigint, name: string) {
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}

export function readI64LE(bytes: Uint8Array, offset: number): bigint {
  assertIsUint8Array(bytes, "bytes");
  assertSafeOffset(bytes, offset, 8);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getBigInt64(offset, true);
}

export function readU64LE(bytes: Uint8Array, offset: number): bigint {
  assertIsUint8Array(bytes, "bytes");
  assertSafeOffset(bytes, offset, 8);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getBigUint64(offset, true);
}

export function writeI64LE(value: bigint, bytes: Uint8Array, offset: number): void {
  assertIsUint8Array(bytes, "bytes");
  assertSafeOffset(bytes, offset, 8);
  assertBigIntInRange(value, MIN_I64, MAX_I64, "value");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setBigInt64(offset, value, true);
}

export function writeU64LE(value: bigint, bytes: Uint8Array, offset: number): void {
  assertIsUint8Array(bytes, "bytes");
  assertSafeOffset(bytes, offset, 8);
  assertBigIntInRange(value, 0n, MAX_U64, "value");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setBigUint64(offset, value, true);
}
