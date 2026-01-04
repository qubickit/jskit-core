import { identityFromPublicKey } from "../primitives/identity.js";
import { getWasmCrypto } from "./schnorrq.js";

export const SEED_LENGTH = 55;

function assertSeed(seed: string) {
  if (typeof seed !== "string") {
    throw new TypeError("seed must be a string");
  }
  if (seed.length !== SEED_LENGTH) {
    throw new RangeError(`seed must be ${SEED_LENGTH} characters`);
  }
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    if (c < 97 || c > 122) {
      throw new Error("seed must contain only lowercase letters a-z");
    }
  }
}

function seedToBytes(seed: string): Uint8Array {
  const bytes = new Uint8Array(SEED_LENGTH);
  for (let i = 0; i < SEED_LENGTH; i++) {
    bytes[i] = seed.charCodeAt(i) - 97; // 'a'
  }
  return bytes;
}

function applySeedIndex(preimage: Uint8Array, index: number) {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError("index must be a non-negative integer");
  }
  while (index-- > 0) {
    for (let i = 0; i < preimage.length; i++) {
      const next = (preimage[i] ?? 0) + 1;
      if (next > 26) {
        preimage[i] = 1;
      } else {
        preimage[i] = next;
        break;
      }
    }
  }
}

async function k12Hash(input: Uint8Array, outLen: number, outOffset = 0): Promise<Uint8Array> {
  const { K12 } = await getWasmCrypto();
  const out = new Uint8Array(outLen + outOffset);
  K12(input, out, outLen, outOffset);
  return out;
}

export async function privateKeyFromSeed(seed: string, index = 0): Promise<Uint8Array> {
  assertSeed(seed);
  const preimage = seedToBytes(seed);
  applySeedIndex(preimage, index);
  return k12Hash(preimage, 32);
}

export async function publicKeyFromSeed(seed: string, index = 0): Promise<Uint8Array> {
  const privateKey = await privateKeyFromSeed(seed, index);
  const { schnorrq } = await getWasmCrypto();
  return schnorrq.generatePublicKey(privateKey);
}

export async function identityFromSeed(seed: string, index = 0): Promise<string> {
  const publicKey = await publicKeyFromSeed(seed, index);
  return identityFromPublicKey(publicKey);
}
