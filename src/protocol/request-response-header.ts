export const MAX_PACKET_SIZE = 0xffffff; // 16,777,215 (3 bytes)

export type RequestResponseHeaderFields = Readonly<{
  size: number; // total packet size including this header
  type: number; // uint8
  dejavu: number; // uint32
}>;

function assertIntegerInRange(value: number, min: number, max: number, name: string) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}

export function encodeRequestResponseHeader(fields: RequestResponseHeaderFields): Uint8Array {
  assertIntegerInRange(fields.size, 1, MAX_PACKET_SIZE, "size");
  assertIntegerInRange(fields.type, 0, 0xff, "type");
  assertIntegerInRange(fields.dejavu, 0, 0xffffffff, "dejavu");

  const bytes = new Uint8Array(8);
  bytes[0] = fields.size & 0xff;
  bytes[1] = (fields.size >> 8) & 0xff;
  bytes[2] = (fields.size >> 16) & 0xff;
  bytes[3] = fields.type & 0xff;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(4, fields.dejavu >>> 0, true);
  return bytes;
}

export function decodeRequestResponseHeader(bytes: Uint8Array): RequestResponseHeaderFields {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bytes must be a Uint8Array");
  }
  if (bytes.byteLength < 8) {
    throw new RangeError("bytes must be at least 8 bytes");
  }

  const size = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16)) >>> 0;
  const type = bytes[3] ?? 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dejavu = view.getUint32(4, true);

  // Core treats size=0 as broken; enforce invariant here to fail fast.
  if (size === 0) {
    throw new RangeError("Invalid header: size cannot be 0");
  }
  if (size > MAX_PACKET_SIZE) {
    throw new RangeError(`Invalid header: size cannot exceed ${MAX_PACKET_SIZE}`);
  }

  return { size, type, dejavu };
}

