import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export type CurrentTickInfo = Readonly<{
  tickDuration: number; // uint16
  epoch: number; // uint16
  tick: number; // uint32
  numberOfAlignedVotes: number; // uint16
  numberOfMisalignedVotes: number; // uint16
  initialTick: number; // uint32
}>;

export function encodeRequestCurrentTickInfo(): Uint8Array {
  return encodeRequestPacket(NetworkMessageType.REQUEST_CURRENT_TICK_INFO);
}

export function decodeRespondCurrentTickInfo(payload: Uint8Array): CurrentTickInfo {
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError("payload must be a Uint8Array");
  }
  if (payload.byteLength !== 16) {
    throw new RangeError("payload must be 16 bytes");
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  return {
    tickDuration: view.getUint16(0, true),
    epoch: view.getUint16(2, true),
    tick: view.getUint32(4, true),
    numberOfAlignedVotes: view.getUint16(8, true),
    numberOfMisalignedVotes: view.getUint16(10, true),
    initialTick: view.getUint32(12, true),
  };
}
