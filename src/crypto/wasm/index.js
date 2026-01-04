import Module from "./vendor/libFourQ_K12.js";

const PUBLIC_KEY_LENGTH = 32;

const allocU8 = (length, value) => {
  const ptr = Module._malloc(length);
  const chunk = Module.HEAPU8.subarray(ptr, ptr + length);
  if (value) chunk.set(value);
  return chunk;
};

/** @typedef {Readonly<{ schnorrq: Readonly<{ generatePublicKey(secretKey: Uint8Array): Uint8Array }>; K12(input: Uint8Array, output: Uint8Array, outputLength: number, outputOffset?: number): void }>} WasmCrypto */

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

    resolve({ schnorrq: { generatePublicKey }, K12 });
  };
});

export default crypto;
