import { readI64LE } from "../primitives/number64.js";
import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export const SPECTRUM_DEPTH = 24;
export const ENTITY_RECORD_SIZE = 64;
export const RESPOND_ENTITY_PAYLOAD_SIZE = ENTITY_RECORD_SIZE + 4 + 4 + 32 * SPECTRUM_DEPTH; // 840

export type EntityRecord = Readonly<{
  publicKey32: Uint8Array;
  incomingAmount: bigint; // int64
  outgoingAmount: bigint; // int64
  numberOfIncomingTransfers: number; // uint32
  numberOfOutgoingTransfers: number; // uint32
  latestIncomingTransferTick: number; // uint32
  latestOutgoingTransferTick: number; // uint32
}>;

export type RespondEntity = Readonly<{
  entity: EntityRecord;
  tick: number; // uint32
  spectrumIndex: number; // int32
  siblings: ReadonlyArray<Uint8Array>; // [SPECTRUM_DEPTH][32]
}>;

function assertUint8ArrayLength(bytes: Uint8Array, length: number, name: string) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
  if (bytes.byteLength !== length) {
    throw new RangeError(`${name} must be ${length} bytes`);
  }
}

export function encodeRequestEntity(publicKey32: Uint8Array): Uint8Array {
  assertUint8ArrayLength(publicKey32, 32, "publicKey32");
  return encodeRequestPacket(NetworkMessageType.REQUEST_ENTITY, publicKey32);
}

export function decodeRespondEntity(payload: Uint8Array): RespondEntity {
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError("payload must be a Uint8Array");
  }
  if (payload.byteLength !== RESPOND_ENTITY_PAYLOAD_SIZE) {
    throw new RangeError(`payload must be ${RESPOND_ENTITY_PAYLOAD_SIZE} bytes`);
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  const publicKey32 = payload.subarray(0, 32);
  const incomingAmount = readI64LE(payload, 32);
  const outgoingAmount = readI64LE(payload, 40);
  const numberOfIncomingTransfers = view.getUint32(48, true);
  const numberOfOutgoingTransfers = view.getUint32(52, true);
  const latestIncomingTransferTick = view.getUint32(56, true);
  const latestOutgoingTransferTick = view.getUint32(60, true);

  const tick = view.getUint32(64, true);
  const spectrumIndex = view.getInt32(68, true);

  const siblingsOffset = 72;
  const siblings: Uint8Array[] = [];
  for (let i = 0; i < SPECTRUM_DEPTH; i++) {
    const start = siblingsOffset + i * 32;
    siblings.push(payload.slice(start, start + 32));
  }

  return {
    entity: {
      publicKey32: publicKey32.slice(),
      incomingAmount,
      outgoingAmount,
      numberOfIncomingTransfers,
      numberOfOutgoingTransfers,
      latestIncomingTransferTick,
      latestOutgoingTransferTick,
    },
    tick,
    spectrumIndex,
    siblings,
  };
}
