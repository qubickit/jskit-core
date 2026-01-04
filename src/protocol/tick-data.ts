import { readI64LE } from "../primitives/number64.js";
import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export const NUMBER_OF_TRANSACTIONS_PER_TICK = 1024;
export const MAX_NUMBER_OF_CONTRACTS = 1024;
export const SIGNATURE_LENGTH = 64;

export const TICK_DATA_PAYLOAD_SIZE =
  16 + // fixed header fields
  32 + // timelock
  NUMBER_OF_TRANSACTIONS_PER_TICK * 32 +
  MAX_NUMBER_OF_CONTRACTS * 8 +
  SIGNATURE_LENGTH;

export type TickDataView = Readonly<{
  computorIndex: number; // uint16
  epoch: number; // uint16
  tick: number; // uint32

  millisecond: number; // uint16
  second: number; // uint8
  minute: number; // uint8
  hour: number; // uint8
  day: number; // uint8
  month: number; // uint8
  year: number; // uint8

  timelock32: Uint8Array;
  signature64: Uint8Array;

  getTransactionDigest(index: number): Uint8Array;
  getContractFee(index: number): bigint;
}>;

function assertU32(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} must be a uint32`);
  }
}

export function encodeRequestTickData(tick: number): Uint8Array {
  assertU32(tick, "tick");
  const payload = new Uint8Array(4);
  new DataView(payload.buffer).setUint32(0, tick, true);
  return encodeRequestPacket(NetworkMessageType.REQUEST_TICK_DATA, payload);
}

export function decodeBroadcastFutureTickData(payload: Uint8Array): TickDataView {
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError("payload must be a Uint8Array");
  }
  if (payload.byteLength !== TICK_DATA_PAYLOAD_SIZE) {
    throw new RangeError(`payload must be ${TICK_DATA_PAYLOAD_SIZE} bytes`);
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  const computorIndex = view.getUint16(0, true);
  const epoch = view.getUint16(2, true);
  const tick = view.getUint32(4, true);

  const millisecond = view.getUint16(8, true);
  const second = view.getUint8(10);
  const minute = view.getUint8(11);
  const hour = view.getUint8(12);
  const day = view.getUint8(13);
  const month = view.getUint8(14);
  const year = view.getUint8(15);

  const timelockOffset = 16;
  const transactionDigestsOffset = timelockOffset + 32;
  const contractFeesOffset = transactionDigestsOffset + NUMBER_OF_TRANSACTIONS_PER_TICK * 32;
  const signatureOffset = contractFeesOffset + MAX_NUMBER_OF_CONTRACTS * 8;

  const timelock32 = payload.slice(timelockOffset, timelockOffset + 32);
  const signature64 = payload.slice(signatureOffset, signatureOffset + SIGNATURE_LENGTH);

  const getTransactionDigest = (index: number): Uint8Array => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= NUMBER_OF_TRANSACTIONS_PER_TICK) {
      throw new RangeError("index out of range");
    }
    const start = transactionDigestsOffset + index * 32;
    return payload.subarray(start, start + 32);
  };

  const getContractFee = (index: number): bigint => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= MAX_NUMBER_OF_CONTRACTS) {
      throw new RangeError("index out of range");
    }
    const start = contractFeesOffset + index * 8;
    return readI64LE(payload, start);
  };

  return {
    computorIndex,
    epoch,
    tick,
    millisecond,
    second,
    minute,
    hour,
    day,
    month,
    year,
    timelock32,
    signature64,
    getTransactionDigest,
    getContractFee,
  };
}

export function countNonZeroTransactionDigests(tickData: TickDataView): number {
  let count = 0;
  for (let i = 0; i < NUMBER_OF_TRANSACTIONS_PER_TICK; i++) {
    const d = tickData.getTransactionDigest(i);
    let nonZero = false;
    for (let j = 0; j < d.byteLength; j++) {
      if ((d[j] ?? 0) !== 0) {
        nonZero = true;
        break;
      }
    }
    if (nonZero) count++;
  }
  return count;
}
