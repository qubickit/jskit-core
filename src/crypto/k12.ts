import { getWasmCrypto } from "./schnorrq.js";

export async function k12(input: Uint8Array, dkLen: number): Promise<Uint8Array> {
  if (!(input instanceof Uint8Array)) {
    throw new TypeError("input must be a Uint8Array");
  }
  if (!Number.isSafeInteger(dkLen) || dkLen < 0) {
    throw new RangeError("dkLen must be a non-negative integer");
  }

  const { K12 } = await getWasmCrypto();
  const out = new Uint8Array(dkLen);
  K12(input, out, dkLen);
  return out;
}
