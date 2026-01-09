import { k12 as k12Hash } from "@qubic-labs/schnorrq";

export async function k12(input: Uint8Array, dkLen: number): Promise<Uint8Array> {
  if (!(input instanceof Uint8Array)) {
    throw new TypeError("input must be a Uint8Array");
  }
  if (!Number.isSafeInteger(dkLen) || dkLen < 0) {
    throw new RangeError("dkLen must be a non-negative integer");
  }

  return k12Hash(input, dkLen);
}
