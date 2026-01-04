import Module from "./vendor/libFourQ_K12.js";

const PUBLIC_KEY_LENGTH = 32;
const SIGNATURE_LENGTH = 64;

const allocU8 = (length, value) => {
  const ptr = Module._malloc(length);
  const chunk = Module.HEAPU8.subarray(ptr, ptr + length);
  if (value) chunk.set(value);
  return chunk;
};

const allocU16 = (length) => {
  const ptr = Module._malloc(length * 2);
  return Module.HEAPU16.subarray(ptr / 2, ptr / 2 + length);
};

/** @typedef {Readonly<{ schnorrq: Readonly<{ generatePublicKey(secretKey: Uint8Array): Uint8Array; sign(secretKey: Uint8Array, publicKey: Uint8Array, messageDigest32: Uint8Array): Uint8Array; verify(publicKey: Uint8Array, messageDigest32: Uint8Array, signature64: Uint8Array): number }>; K12(input: Uint8Array, output: Uint8Array, outputLength: number, outputOffset?: number): void }>} WasmCrypto */

/** @type {Promise<WasmCrypto>} */
const crypto = new Promise((resolve) => {
  Module.onRuntimeInitialized = () => {
    const generatePublicKey = (secretKey) => {
      const sk = allocU8(secretKey.length, secretKey);
      const pk = allocU8(PUBLIC_KEY_LENGTH);
      try {
        Module._SchnorrQ_KeyGeneration(sk.byteOffset, pk.byteOffset);
        return pk.slice();
      } finally {
        Module._free(sk.byteOffset);
        Module._free(pk.byteOffset);
      }
    };

    const sign = (secretKey, publicKey, messageDigest32) => {
      const sk = allocU8(secretKey.length, secretKey);
      const pk = allocU8(publicKey.length, publicKey);
      const m = allocU8(messageDigest32.length, messageDigest32);
      const s = allocU8(SIGNATURE_LENGTH);
      try {
        Module._SchnorrQ_Sign(
          sk.byteOffset,
          pk.byteOffset,
          m.byteOffset,
          messageDigest32.length,
          s.byteOffset,
        );
        return s.slice();
      } finally {
        Module._free(sk.byteOffset);
        Module._free(pk.byteOffset);
        Module._free(m.byteOffset);
        Module._free(s.byteOffset);
      }
    };

    const verify = (publicKey, messageDigest32, signature64) => {
      const pk = allocU8(publicKey.length, publicKey);
      const m = allocU8(messageDigest32.length, messageDigest32);
      const s = allocU8(signature64.length, signature64);
      const v = allocU16(1);
      try {
        Module._SchnorrQ_Verify(
          pk.byteOffset,
          m.byteOffset,
          messageDigest32.length,
          s.byteOffset,
          v.byteOffset,
        );
        return v[0];
      } finally {
        Module._free(pk.byteOffset);
        Module._free(m.byteOffset);
        Module._free(s.byteOffset);
        Module._free(v.byteOffset);
      }
    };

    const K12 = (input, output, outputLength, outputOffset = 0) => {
      const i = allocU8(input.length, input);
      const o = allocU8(outputLength, new Uint8Array(outputLength));
      try {
        Module._KangarooTwelve(i.byteOffset, input.length, o.byteOffset, outputLength, 0, 0);
        output.set(o.slice(), outputOffset);
      } finally {
        Module._free(i.byteOffset);
        Module._free(o.byteOffset);
      }
    };

    resolve({ schnorrq: { generatePublicKey, sign, verify }, K12 });
  };
});

export default crypto;
