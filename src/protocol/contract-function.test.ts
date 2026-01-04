import { describe, expect, it } from "bun:test";
import {
  decodeRespondContractFunction,
  encodeRequestContractFunction,
  REQUEST_CONTRACT_FUNCTION_PREFIX_SIZE,
} from "./contract-function.js";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";

describe("contract-function", () => {
  it("encodes request contract function packet", () => {
    const packet = encodeRequestContractFunction({
      contractIndex: 123,
      inputType: 42,
      inputBytes: Uint8Array.from([1, 2, 3]),
    });

    const header = decodeRequestResponseHeader(packet.subarray(0, 8));
    expect(header.type).toBe(NetworkMessageType.REQUEST_CONTRACT_FUNCTION);
    expect(header.size).toBe(8 + REQUEST_CONTRACT_FUNCTION_PREFIX_SIZE + 3);
    expect(header.dejavu).not.toBe(0);

    const payload = packet.subarray(8);
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    expect(view.getUint32(0, true)).toBe(123);
    expect(view.getUint16(4, true)).toBe(42);
    expect(view.getUint16(6, true)).toBe(3);
    expect(payload.subarray(REQUEST_CONTRACT_FUNCTION_PREFIX_SIZE)).toEqual(
      Uint8Array.from([1, 2, 3]),
    );
  });

  it("decodes contract function response payload as raw bytes", () => {
    const payload = Uint8Array.from([9, 8, 7]);
    expect(decodeRespondContractFunction(payload)).toEqual(payload);
  });
});
