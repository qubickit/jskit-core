import { describe, expect, it } from "bun:test";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";
import { decodeRespondSystemInfo, encodeRequestSystemInfo } from "./system-info.js";

describe("system-info", () => {
  it("encodes request system info packet", () => {
    const packet = encodeRequestSystemInfo();
    expect(packet.byteLength).toBe(8);
    const header = decodeRequestResponseHeader(packet);
    expect(header.size).toBe(8);
    expect(header.type).toBe(NetworkMessageType.REQUEST_SYSTEM_INFO);
    expect(header.dejavu).not.toBe(0);
  });

  it("decodes respond system info payload", () => {
    const payload = new Uint8Array(128);
    const view = new DataView(payload.buffer);

    view.setInt16(0, 123, true);
    view.setUint16(2, 42, true);
    view.setUint32(4, 1001, true);
    view.setUint32(8, 500, true);
    view.setUint32(12, 999, true);

    view.setUint16(16, 250, true);
    view.setUint8(18, 1);
    view.setUint8(19, 2);
    view.setUint8(20, 3);
    view.setUint8(21, 4);
    view.setUint8(22, 5);
    view.setUint8(23, 6);

    view.setUint32(24, 10, true);
    view.setUint32(28, 20, true);

    payload.set(new Uint8Array(32).fill(9), 32);
    view.setInt32(64, -7, true);

    view.setBigUint64(68, 1234n, true);
    view.setBigUint64(76, 5678n, true);
    view.setUint32(84, 0xdeadbeef, true);
    view.setBigUint64(88, 9999n, true);

    view.setBigUint64(96, 1n, true);
    view.setBigUint64(104, 2n, true);
    view.setBigUint64(112, 3n, true);
    view.setBigUint64(120, 4n, true);

    const decoded = decodeRespondSystemInfo(payload);
    expect(decoded.version).toBe(123);
    expect(decoded.epoch).toBe(42);
    expect(decoded.tick).toBe(1001);
    expect(decoded.initialTick).toBe(500);
    expect(decoded.latestCreatedTick).toBe(999);
    expect(decoded.initialMillisecond).toBe(250);
    expect(decoded.initialSecond).toBe(1);
    expect(decoded.initialMinute).toBe(2);
    expect(decoded.initialHour).toBe(3);
    expect(decoded.initialDay).toBe(4);
    expect(decoded.initialMonth).toBe(5);
    expect(decoded.initialYear).toBe(6);
    expect(decoded.numberOfEntities).toBe(10);
    expect(decoded.numberOfTransactions).toBe(20);
    expect(decoded.randomMiningSeed32).toEqual(new Uint8Array(32).fill(9));
    expect(decoded.solutionThreshold).toBe(-7);
    expect(decoded.totalSpectrumAmount).toBe(1234n);
    expect(decoded.currentEntityBalanceDustThreshold).toBe(5678n);
    expect(decoded.targetTickVoteSignature).toBe(0xdeadbeef);
    expect(decoded.computorPacketSignature).toBe(9999n);
    expect(decoded.reserve1).toBe(1n);
    expect(decoded.reserve2).toBe(2n);
    expect(decoded.reserve3).toBe(3n);
    expect(decoded.reserve4).toBe(4n);
  });
});
