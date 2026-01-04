import { describe, expect, it } from "bun:test";
import {
  ASSETS_DEPTH,
  AssetRecordType,
  decodeAssetRecord,
  decodeRespondAssets,
  decodeRespondAssetsWithSiblings,
  encodeRequestAssetsByFilter,
  encodeRequestAssetsByUniverseIndex,
  RESPOND_ASSETS_PAYLOAD_SIZE,
  RESPOND_ASSETS_WITH_SIBLINGS_PAYLOAD_SIZE,
  RequestAssetsFlag,
  RequestAssetsType,
} from "./assets.js";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";

describe("assets", () => {
  it("encodes RequestAssets by universe index", () => {
    const packet = encodeRequestAssetsByUniverseIndex({ universeIndex: 123, getSiblings: true });
    const header = decodeRequestResponseHeader(packet.subarray(0, 8));
    expect(header.type).toBe(NetworkMessageType.REQUEST_ASSETS);

    const payload = packet.subarray(8);
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    expect(view.getUint16(0, true)).toBe(RequestAssetsType.BY_UNIVERSE_INDEX);
    expect(view.getUint16(2, true) & RequestAssetsFlag.GET_SIBLINGS).toBe(
      RequestAssetsFlag.GET_SIBLINGS,
    );
    expect(view.getUint32(4, true)).toBe(123);
  });

  it("encodes RequestAssets issuance by filter with anyIssuer/anyAssetName flags", () => {
    const packet = encodeRequestAssetsByFilter({
      requestType: RequestAssetsType.ISSUANCE,
      getSiblings: false,
    });
    const payload = packet.subarray(8);
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    expect(view.getUint16(0, true)).toBe(RequestAssetsType.ISSUANCE);
    const flags = view.getUint16(2, true);
    expect((flags & RequestAssetsFlag.ANY_ISSUER) !== 0).toBe(true);
    expect((flags & RequestAssetsFlag.ANY_ASSET_NAME) !== 0).toBe(true);
  });

  it("decodes issuance AssetRecord", () => {
    const record = new Uint8Array(48);
    record.set(new Uint8Array(32).fill(1), 0);
    record[32] = AssetRecordType.ISSUANCE;
    record.set(Uint8Array.from([65, 66, 67, 0, 0, 0, 0]), 33); // "ABC"
    record[40] = 8;
    record.set(new Uint8Array(7).fill(2), 41);

    const decoded = decodeAssetRecord(record);
    expect(decoded.type).toBe(AssetRecordType.ISSUANCE);
    if (decoded.type === AssetRecordType.ISSUANCE) {
      expect(decoded.name7).toEqual(Uint8Array.from([65, 66, 67, 0, 0, 0, 0]));
      expect(decoded.numberOfDecimalPlaces).toBe(8);
    }
  });

  it("decodes RespondAssets and RespondAssetsWithSiblings", () => {
    const payload = new Uint8Array(RESPOND_ASSETS_PAYLOAD_SIZE);
    payload[32] = AssetRecordType.OWNERSHIP;
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    view.setUint16(34, 10, true);
    view.setUint32(36, 20, true);
    view.setBigInt64(40, 30n, true);
    view.setUint32(48, 111, true);
    view.setUint32(52, 222, true);

    const decoded = decodeRespondAssets(payload);
    expect(decoded.tick).toBe(111);
    expect(decoded.universeIndex).toBe(222);
    expect(decoded.asset.type).toBe(AssetRecordType.OWNERSHIP);

    const payload2 = new Uint8Array(RESPOND_ASSETS_WITH_SIBLINGS_PAYLOAD_SIZE);
    payload2.set(payload, 0);
    for (let i = 0; i < ASSETS_DEPTH; i++)
      payload2.set(new Uint8Array(32).fill(i), RESPOND_ASSETS_PAYLOAD_SIZE + i * 32);
    const decoded2 = decodeRespondAssetsWithSiblings(payload2);
    expect(decoded2.siblings).toHaveLength(ASSETS_DEPTH);
    expect(decoded2.siblings[0]).toEqual(new Uint8Array(32).fill(0));
    expect(decoded2.siblings[23]).toEqual(new Uint8Array(32).fill(23));
  });
});
