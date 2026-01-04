import { describe, expect, it } from "bun:test";
import {
  decodeRespondEntity,
  encodeRequestEntity,
  RESPOND_ENTITY_PAYLOAD_SIZE,
  SPECTRUM_DEPTH,
} from "./entity.js";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";

describe("entity", () => {
  it("encodes request entity packet", () => {
    const pub = new Uint8Array(32).fill(7);
    const packet = encodeRequestEntity(pub);
    expect(packet.byteLength).toBe(8 + 32);
    const header = decodeRequestResponseHeader(packet.subarray(0, 8));
    expect(header.size).toBe(40);
    expect(header.type).toBe(NetworkMessageType.REQUEST_ENTITY);
    expect(packet.subarray(8)).toEqual(pub);
  });

  it("decodes respond entity payload", () => {
    const payload = new Uint8Array(RESPOND_ENTITY_PAYLOAD_SIZE);
    payload.set(
      new Uint8Array(32).map((_, i) => i),
      0,
    );

    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    view.setBigInt64(32, 100n, true);
    view.setBigInt64(40, 25n, true);
    view.setUint32(48, 3, true);
    view.setUint32(52, 4, true);
    view.setUint32(56, 111, true);
    view.setUint32(60, 222, true);
    view.setUint32(64, 333, true);
    view.setInt32(68, -1, true);

    const siblingsOffset = 72;
    for (let i = 0; i < SPECTRUM_DEPTH; i++) {
      const sib = new Uint8Array(32).fill(i);
      payload.set(sib, siblingsOffset + i * 32);
    }

    const decoded = decodeRespondEntity(payload);
    expect(decoded.tick).toBe(333);
    expect(decoded.spectrumIndex).toBe(-1);
    expect(decoded.entity.incomingAmount).toBe(100n);
    expect(decoded.entity.outgoingAmount).toBe(25n);
    expect(decoded.entity.numberOfIncomingTransfers).toBe(3);
    expect(decoded.entity.numberOfOutgoingTransfers).toBe(4);
    expect(decoded.entity.latestIncomingTransferTick).toBe(111);
    expect(decoded.entity.latestOutgoingTransferTick).toBe(222);
    expect(decoded.siblings).toHaveLength(SPECTRUM_DEPTH);
    expect(decoded.siblings[0]).toEqual(new Uint8Array(32).fill(0));
    expect(decoded.siblings[23]).toEqual(new Uint8Array(32).fill(23));
  });
});
