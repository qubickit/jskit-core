import { k12 } from "../crypto/k12.js";
import { sign } from "../crypto/schnorrq.js";
import { identityFromPublicKey } from "../primitives/identity.js";
import { MAX_I64, MIN_I64, writeI64LE } from "../primitives/number64.js";

export const TRANSACTION_HEADER_SIZE = 80;
export const SIGNATURE_LENGTH = 64;
export const MAX_TRANSACTION_SIZE = 1024;
export const MAX_INPUT_SIZE = MAX_TRANSACTION_SIZE - (TRANSACTION_HEADER_SIZE + SIGNATURE_LENGTH);

export type BuildUnsignedTransactionParams = Readonly<{
  sourcePublicKey32: Uint8Array;
  destinationPublicKey32: Uint8Array;
  amount: bigint | number;
  tick: number;
  inputType?: number;
  inputBytes?: Uint8Array;
}>;

function assertUint8ArrayLength(bytes: Uint8Array, length: number, name: string) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
  if (bytes.byteLength !== length) {
    throw new RangeError(`${name} must be ${length} bytes`);
  }
}

function assertU32(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} must be a uint32`);
  }
}

function assertU16(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${name} must be a uint16`);
  }
}

function toI64(value: bigint | number, name: string): bigint {
  const bigintValue = typeof value === "number" ? BigInt(value) : value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      throw new RangeError(`${name} must be a safe integer`);
    }
  }
  if (bigintValue < MIN_I64 || bigintValue > MAX_I64) {
    throw new RangeError(`${name} must fit in int64`);
  }
  return bigintValue;
}

export function buildUnsignedTransaction(params: BuildUnsignedTransactionParams): Uint8Array {
  const inputType = params.inputType ?? 0;
  const inputBytes = params.inputBytes ?? new Uint8Array();

  assertUint8ArrayLength(params.sourcePublicKey32, 32, "sourcePublicKey32");
  assertUint8ArrayLength(params.destinationPublicKey32, 32, "destinationPublicKey32");
  assertU16(inputType, "inputType");
  assertU32(params.tick, "tick");

  if (!(inputBytes instanceof Uint8Array)) {
    throw new TypeError("inputBytes must be a Uint8Array");
  }
  if (inputBytes.byteLength > MAX_INPUT_SIZE) {
    throw new RangeError(`inputBytes must be <= ${MAX_INPUT_SIZE} bytes`);
  }

  const inputSize = inputBytes.byteLength;
  const out = new Uint8Array(TRANSACTION_HEADER_SIZE + inputSize);
  out.set(params.sourcePublicKey32, 0);
  out.set(params.destinationPublicKey32, 32);
  writeI64LE(toI64(params.amount, "amount"), out, 64);

  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(72, params.tick, true);
  view.setUint16(76, inputType, true);
  view.setUint16(78, inputSize, true);
  out.set(inputBytes, TRANSACTION_HEADER_SIZE);

  return out;
}

export async function unsignedTransactionDigest(unsignedTxBytes: Uint8Array): Promise<Uint8Array> {
  if (!(unsignedTxBytes instanceof Uint8Array)) {
    throw new TypeError("unsignedTxBytes must be a Uint8Array");
  }
  return k12(unsignedTxBytes, 32);
}

export async function signTransaction(
  unsignedTxBytes: Uint8Array,
  secretKey32: Uint8Array,
): Promise<Uint8Array> {
  if (!(unsignedTxBytes instanceof Uint8Array)) {
    throw new TypeError("unsignedTxBytes must be a Uint8Array");
  }
  assertUint8ArrayLength(secretKey32, 32, "secretKey32");
  if (unsignedTxBytes.byteLength < TRANSACTION_HEADER_SIZE) {
    throw new RangeError("unsignedTxBytes is too short");
  }

  const view = new DataView(
    unsignedTxBytes.buffer,
    unsignedTxBytes.byteOffset,
    unsignedTxBytes.byteLength,
  );
  const inputSize = view.getUint16(78, true);
  if (unsignedTxBytes.byteLength !== TRANSACTION_HEADER_SIZE + inputSize) {
    throw new RangeError("unsignedTxBytes length does not match inputSize");
  }

  const digest32 = await unsignedTransactionDigest(unsignedTxBytes);
  const publicKey32 = unsignedTxBytes.subarray(0, 32);
  return sign(secretKey32, publicKey32, digest32);
}

export async function buildSignedTransaction(
  params: BuildUnsignedTransactionParams,
  secretKey32: Uint8Array,
): Promise<Uint8Array> {
  const unsignedTxBytes = buildUnsignedTransaction(params);
  const signature64 = await signTransaction(unsignedTxBytes, secretKey32);
  assertUint8ArrayLength(signature64, SIGNATURE_LENGTH, "signature64");

  const out = new Uint8Array(unsignedTxBytes.byteLength + SIGNATURE_LENGTH);
  out.set(unsignedTxBytes, 0);
  out.set(signature64, unsignedTxBytes.byteLength);
  return out;
}

export async function transactionDigest(txBytes: Uint8Array): Promise<Uint8Array> {
  if (!(txBytes instanceof Uint8Array)) {
    throw new TypeError("txBytes must be a Uint8Array");
  }
  if (txBytes.byteLength < TRANSACTION_HEADER_SIZE + SIGNATURE_LENGTH) {
    throw new RangeError("txBytes is too short");
  }
  if (txBytes.byteLength > MAX_TRANSACTION_SIZE) {
    throw new RangeError(`txBytes must be <= ${MAX_TRANSACTION_SIZE} bytes`);
  }
  return k12(txBytes, 32);
}

export async function transactionId(txBytes: Uint8Array): Promise<string> {
  const digest32 = await transactionDigest(txBytes);
  return identityFromPublicKey(digest32, { lowerCase: true });
}
