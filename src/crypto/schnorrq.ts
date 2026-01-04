import wasmCrypto from "./wasm/index.js";

export type Schnorrq = Readonly<{
  generatePublicKey(secretKey: Uint8Array): Uint8Array;
  sign(secretKey: Uint8Array, publicKey: Uint8Array, messageDigest32: Uint8Array): Uint8Array;
  verify(publicKey: Uint8Array, messageDigest32: Uint8Array, signature64: Uint8Array): number;
}>;

export type WasmCrypto = Readonly<{
  schnorrq: Schnorrq;
  K12(input: Uint8Array, output: Uint8Array, outputLength: number, outputOffset?: number): void;
}>;

export async function getWasmCrypto(): Promise<WasmCrypto> {
  return (await wasmCrypto) as WasmCrypto;
}

export async function getSchnorrq(): Promise<Schnorrq> {
  const { schnorrq } = await getWasmCrypto();
  return schnorrq as Schnorrq;
}
