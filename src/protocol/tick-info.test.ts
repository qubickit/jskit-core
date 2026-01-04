import { describe, expect, it } from "bun:test";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";
import { decodeRespondCurrentTickInfo, encodeRequestCurrentTickInfo } from "./tick-info.js";

describe("tick-info", () => {
  it("encodes request current tick info packet", () => {
    const packet = encodeRequestCurrentTickInfo();
    expect(packet.byteLength).toBe(8);
    const header = decodeRequestResponseHeader(packet);
    expect(header.size).toBe(8);
    expect(header.type).toBe(NetworkMessageType.REQUEST_CURRENT_TICK_INFO);
    expect(header.dejavu).not.toBe(0);
  });

  it("decodes respond current tick info payload", () => {
    const payload = new Uint8Array(16);
    const view = new DataView(payload.buffer);
    view.setUint16(0, 3000, true);
    view.setUint16(2, 42, true);
    view.setUint32(4, 123_456, true);
    view.setUint16(8, 10, true);
    view.setUint16(10, 2, true);
    view.setUint32(12, 1_000, true);

    expect(decodeRespondCurrentTickInfo(payload)).toEqual({
      tickDuration: 3000,
      epoch: 42,
      tick: 123_456,
      numberOfAlignedVotes: 10,
      numberOfMisalignedVotes: 2,
      initialTick: 1_000,
    });
  });
});
