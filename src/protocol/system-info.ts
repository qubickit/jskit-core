import { readU64LE } from "../primitives/number64.js";
import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export const RESPOND_SYSTEM_INFO_PAYLOAD_SIZE = 128;

export type SystemInfo = Readonly<{
  version: number; // int16
  epoch: number; // uint16
  tick: number; // uint32
  initialTick: number; // uint32
  latestCreatedTick: number; // uint32

  initialMillisecond: number; // uint16
  initialSecond: number; // uint8
  initialMinute: number; // uint8
  initialHour: number; // uint8
  initialDay: number; // uint8
  initialMonth: number; // uint8
  initialYear: number; // uint8

  numberOfEntities: number; // uint32
  numberOfTransactions: number; // uint32

  randomMiningSeed32: Uint8Array;
  solutionThreshold: number; // int32

  totalSpectrumAmount: bigint; // uint64
  currentEntityBalanceDustThreshold: bigint; // uint64

  targetTickVoteSignature: number; // uint32
  computorPacketSignature: bigint; // uint64

  reserve1: bigint;
  reserve2: bigint;
  reserve3: bigint;
  reserve4: bigint;
}>;

export function encodeRequestSystemInfo(): Uint8Array {
  return encodeRequestPacket(NetworkMessageType.REQUEST_SYSTEM_INFO);
}

export function decodeRespondSystemInfo(payload: Uint8Array): SystemInfo {
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError("payload must be a Uint8Array");
  }
  if (payload.byteLength !== RESPOND_SYSTEM_INFO_PAYLOAD_SIZE) {
    throw new RangeError(`payload must be ${RESPOND_SYSTEM_INFO_PAYLOAD_SIZE} bytes`);
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  const version = view.getInt16(0, true);
  const epoch = view.getUint16(2, true);
  const tick = view.getUint32(4, true);
  const initialTick = view.getUint32(8, true);
  const latestCreatedTick = view.getUint32(12, true);

  const initialMillisecond = view.getUint16(16, true);
  const initialSecond = view.getUint8(18);
  const initialMinute = view.getUint8(19);
  const initialHour = view.getUint8(20);
  const initialDay = view.getUint8(21);
  const initialMonth = view.getUint8(22);
  const initialYear = view.getUint8(23);

  const numberOfEntities = view.getUint32(24, true);
  const numberOfTransactions = view.getUint32(28, true);

  const randomMiningSeed32 = payload.slice(32, 64);
  const solutionThreshold = view.getInt32(64, true);

  const totalSpectrumAmount = readU64LE(payload, 68);
  const currentEntityBalanceDustThreshold = readU64LE(payload, 76);

  const targetTickVoteSignature = view.getUint32(84, true);
  const computorPacketSignature = readU64LE(payload, 88);

  const reserve1 = readU64LE(payload, 96);
  const reserve2 = readU64LE(payload, 104);
  const reserve3 = readU64LE(payload, 112);
  const reserve4 = readU64LE(payload, 120);

  return {
    version,
    epoch,
    tick,
    initialTick,
    latestCreatedTick,
    initialMillisecond,
    initialSecond,
    initialMinute,
    initialHour,
    initialDay,
    initialMonth,
    initialYear,
    numberOfEntities,
    numberOfTransactions,
    randomMiningSeed32,
    solutionThreshold,
    totalSpectrumAmount,
    currentEntityBalanceDustThreshold,
    targetTickVoteSignature,
    computorPacketSignature,
    reserve1,
    reserve2,
    reserve3,
    reserve4,
  };
}
