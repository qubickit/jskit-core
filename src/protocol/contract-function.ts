import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export const REQUEST_CONTRACT_FUNCTION_PREFIX_SIZE = 8; // u32 + u16 + u16

export type RequestContractFunctionParams = Readonly<{
  contractIndex: number; // uint32
  inputType: number; // uint16
  inputBytes: Uint8Array;
}>;

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

export function encodeRequestContractFunction(params: RequestContractFunctionParams): Uint8Array {
  assertU32(params.contractIndex, "contractIndex");
  assertU16(params.inputType, "inputType");

  if (!(params.inputBytes instanceof Uint8Array)) {
    throw new TypeError("inputBytes must be a Uint8Array");
  }
  if (params.inputBytes.byteLength > 0xffff) {
    throw new RangeError("inputBytes must be <= 65535 bytes");
  }

  const payload = new Uint8Array(
    REQUEST_CONTRACT_FUNCTION_PREFIX_SIZE + params.inputBytes.byteLength,
  );
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setUint32(0, params.contractIndex, true);
  view.setUint16(4, params.inputType, true);
  view.setUint16(6, params.inputBytes.byteLength, true);
  payload.set(params.inputBytes, REQUEST_CONTRACT_FUNCTION_PREFIX_SIZE);

  return encodeRequestPacket(NetworkMessageType.REQUEST_CONTRACT_FUNCTION, payload);
}

export function decodeRespondContractFunction(payload: Uint8Array): Uint8Array {
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError("payload must be a Uint8Array");
  }
  // Contract response is variable length; empty payload indicates failure.
  return payload.slice();
}
