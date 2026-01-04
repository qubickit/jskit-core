import { k12 } from "@noble/hashes/sha3-addons";
import { readU64LE, writeU64LE } from "./number64.js";

export type IdentityOptions = Readonly<{
  lowerCase?: boolean;
}>;

function assertUint8ArrayLength(bytes: Uint8Array, length: number, name: string) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
  if (bytes.byteLength !== length) {
    throw new RangeError(`${name} must be ${length} bytes`);
  }
}

function isAllUppercaseLetters(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 65 || c > 90) return false;
  }
  return true;
}

function isAllLowercaseLetters(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 97 || c > 122) return false;
  }
  return true;
}

export function identityFromPublicKey(
  publicKey32: Uint8Array,
  options: IdentityOptions = {},
): string {
  assertUint8ArrayLength(publicKey32, 32, "publicKey32");

  const letter = options.lowerCase ? 97 : 65; // 'a' or 'A'
  const identityChars = new Uint8Array(60);

  for (let i = 0; i < 4; i++) {
    let fragment = readU64LE(publicKey32, i * 8);
    for (let j = 0; j < 14; j++) {
      identityChars[i * 14 + j] = Number((fragment % 26n) + BigInt(letter));
      fragment /= 26n;
    }
  }

  const checksum = k12(publicKey32, { dkLen: 3 });
  let checksumInt =
    ((checksum[0] ?? 0) | ((checksum[1] ?? 0) << 8) | ((checksum[2] ?? 0) << 16)) & 0x3ffff;

  for (let i = 0; i < 4; i++) {
    identityChars[56 + i] = (checksumInt % 26) + letter;
    checksumInt = Math.floor(checksumInt / 26);
  }

  return new TextDecoder().decode(identityChars);
}

export function publicKeyFromIdentity(identity60: string): Uint8Array {
  if (typeof identity60 !== "string") {
    throw new TypeError("identity60 must be a string");
  }
  if (identity60.length !== 60) {
    throw new RangeError("identity60 must be 60 characters");
  }

  const isUpper = isAllUppercaseLetters(identity60);
  const isLower = isAllLowercaseLetters(identity60);
  if (!isUpper && !isLower) {
    throw new Error("identity60 must contain only A-Z or only a-z letters");
  }

  const base = isLower ? 97 : 65;
  const publicKey = new Uint8Array(32);

  for (let i = 0; i < 4; i++) {
    let acc = 0n;
    for (let j = 13; j >= 0; j--) {
      const c = identity60.charCodeAt(i * 14 + j);
      const v = c - base;
      if (v < 0 || v > 25) {
        throw new Error("identity60 contains invalid characters");
      }
      acc = acc * 26n + BigInt(v);
    }
    writeU64LE(acc, publicKey, i * 8);
  }

  const expected = identityFromPublicKey(publicKey, { lowerCase: isLower });
  if (expected !== identity60) {
    throw new Error("identity60 checksum mismatch");
  }

  return publicKey;
}

export function verifyIdentity(identity60: string): boolean {
  try {
    publicKeyFromIdentity(identity60);
    return true;
  } catch {
    return false;
  }
}
