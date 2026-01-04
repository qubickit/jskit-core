import { describe, expect, it } from "bun:test";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";
import {
  countNonZeroTransactionDigests,
  decodeBroadcastFutureTickData,
  encodeRequestTickData,
  MAX_NUMBER_OF_CONTRACTS,
  NUMBER_OF_TRANSACTIONS_PER_TICK,
  TICK_DATA_PAYLOAD_SIZE,
} from "./tick-data.js";

describe("tick-data", () => {
  it("encodes request tick data packet", () => {
    const packet = encodeRequestTickData(1234);
    expect(packet.byteLength).toBe(8 + 4);
    const header = decodeRequestResponseHeader(packet.subarray(0, 8));
    expect(header.type).toBe(NetworkMessageType.REQUEST_TICK_DATA);

    const tick = new DataView(packet.buffer, packet.byteOffset + 8, 4).getUint32(0, true);
    expect(tick).toBe(1234);
  });

  it("decodes broadcast future tick data payload with accessors", () => {
    const payload = new Uint8Array(TICK_DATA_PAYLOAD_SIZE);
    const view = new DataView(payload.buffer);
    view.setUint16(0, 1, true);
    view.setUint16(2, 2, true);
    view.setUint32(4, 3, true);
    view.setUint16(8, 4, true);
    view.setUint8(10, 5);
    view.setUint8(11, 6);
    view.setUint8(12, 7);
    view.setUint8(13, 8);
    view.setUint8(14, 9);
    view.setUint8(15, 10);

    // timelock
    payload.set(new Uint8Array(32).fill(11), 16);

    // set one non-zero tx digest at index 0
    payload[16 + 32 + 0] = 1;

    // set one contract fee
    const contractFeesOffset = 16 + 32 + NUMBER_OF_TRANSACTIONS_PER_TICK * 32;
    view.setBigInt64(contractFeesOffset + 5 * 8, 123n, true);

    const signatureOffset = contractFeesOffset + MAX_NUMBER_OF_CONTRACTS * 8;
    payload.set(new Uint8Array(64).fill(12), signatureOffset);

    const decoded = decodeBroadcastFutureTickData(payload);
    expect(decoded.computorIndex).toBe(1);
    expect(decoded.epoch).toBe(2);
    expect(decoded.tick).toBe(3);
    expect(decoded.millisecond).toBe(4);
    expect(decoded.second).toBe(5);
    expect(decoded.timelock32).toEqual(new Uint8Array(32).fill(11));
    expect(decoded.signature64).toEqual(new Uint8Array(64).fill(12));
    expect(decoded.getContractFee(5)).toBe(123n);

    expect(countNonZeroTransactionDigests(decoded)).toBe(1);
  });
});
