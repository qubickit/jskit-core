import { readI64LE, readU64LE, writeU64LE } from "../primitives/number64.js";
import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export const ASSETS_DEPTH = 24;
export const ASSET_RECORD_SIZE = 48;
export const RESPOND_ASSETS_PAYLOAD_SIZE = 56;
export const RESPOND_ASSETS_WITH_SIBLINGS_PAYLOAD_SIZE = 824;

export const AssetRecordType = {
  EMPTY: 0,
  ISSUANCE: 1,
  OWNERSHIP: 2,
  POSSESSION: 3,
} as const;

export type IssuanceAssetRecord = Readonly<{
  type: typeof AssetRecordType.ISSUANCE;
  publicKey32: Uint8Array;
  name7: Uint8Array;
  numberOfDecimalPlaces: number; // int8-ish
  unitOfMeasurement7: Uint8Array;
}>;

export type OwnershipAssetRecord = Readonly<{
  type: typeof AssetRecordType.OWNERSHIP;
  publicKey32: Uint8Array;
  managingContractIndex: number; // uint16
  issuanceIndex: number; // uint32
  numberOfShares: bigint; // int64
}>;

export type PossessionAssetRecord = Readonly<{
  type: typeof AssetRecordType.POSSESSION;
  publicKey32: Uint8Array;
  managingContractIndex: number; // uint16
  ownershipIndex: number; // uint32
  numberOfShares: bigint; // int64
}>;

export type AssetRecord =
  | IssuanceAssetRecord
  | OwnershipAssetRecord
  | PossessionAssetRecord
  | Readonly<{ type: typeof AssetRecordType.EMPTY; publicKey32: Uint8Array }>;

export type RespondAssets = Readonly<{
  asset: AssetRecord;
  tick: number; // uint32
  universeIndex: number; // uint32
}>;

export type RespondAssetsWithSiblings = Readonly<
  RespondAssets & { siblings: ReadonlyArray<Uint8Array> }
>;

function assertUint8ArrayLength(bytes: Uint8Array, length: number, name: string) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
  if (bytes.byteLength !== length) {
    throw new RangeError(`${name} must be ${length} bytes`);
  }
}

function assertU32(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} must be a uint32`);
  }
}

function assertU16(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${name} must be a uint16`);
  }
}

export const RequestAssetsType = {
  ISSUANCE: 0,
  OWNERSHIP: 1,
  POSSESSION: 2,
  BY_UNIVERSE_INDEX: 3,
} as const;

export const RequestAssetsFlag = {
  GET_SIBLINGS: 0b1,
  ANY_ISSUER: 0b10,
  ANY_ASSET_NAME: 0b100,
  ANY_OWNER: 0b1000,
  ANY_OWNERSHIP_MANAGING_CONTRACT: 0b10000,
  ANY_POSSESSOR: 0b100000,
  ANY_POSSESSION_MANAGING_CONTRACT: 0b1000000,
} as const;

export type RequestAssetsByFilterParams = Readonly<{
  requestType:
    | typeof RequestAssetsType.ISSUANCE
    | typeof RequestAssetsType.OWNERSHIP
    | typeof RequestAssetsType.POSSESSION;
  getSiblings?: boolean;

  issuerPublicKey32?: Uint8Array;
  assetNameU64LE?: bigint;
  ownerPublicKey32?: Uint8Array;
  possessorPublicKey32?: Uint8Array;
  ownershipManagingContractIndex?: number;
  possessionManagingContractIndex?: number;
}>;

export type RequestAssetsByUniverseIndexParams = Readonly<{
  universeIndex: number; // uint32
  getSiblings?: boolean;
}>;

export function assetNameToU64LE(name: string): bigint {
  if (typeof name !== "string") {
    throw new TypeError("name must be a string");
  }
  if (name.length > 8) {
    throw new RangeError("name must be <= 8 characters");
  }
  const bytes = new Uint8Array(8);
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c < 32 || c > 126) throw new Error("name must be ASCII");
    bytes[i] = c;
  }
  return readU64LE(bytes, 0);
}

export function encodeRequestAssetsByUniverseIndex(
  params: RequestAssetsByUniverseIndexParams,
): Uint8Array {
  assertU32(params.universeIndex, "universeIndex");

  const flags = params.getSiblings ? RequestAssetsFlag.GET_SIBLINGS : 0;
  const payload = new Uint8Array(112);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setUint16(0, RequestAssetsType.BY_UNIVERSE_INDEX, true);
  view.setUint16(2, flags, true);
  view.setUint32(4, params.universeIndex, true);
  return encodeRequestPacket(NetworkMessageType.REQUEST_ASSETS, payload);
}

export function encodeRequestAssetsByFilter(params: RequestAssetsByFilterParams): Uint8Array {
  const requestType = params.requestType;
  if (
    requestType !== RequestAssetsType.ISSUANCE &&
    requestType !== RequestAssetsType.OWNERSHIP &&
    requestType !== RequestAssetsType.POSSESSION
  ) {
    throw new RangeError("requestType is invalid");
  }

  let flags = params.getSiblings ? RequestAssetsFlag.GET_SIBLINGS : 0;

  const ownershipManagingContractIndex = params.ownershipManagingContractIndex ?? 0;
  const possessionManagingContractIndex = params.possessionManagingContractIndex ?? 0;
  assertU16(ownershipManagingContractIndex, "ownershipManagingContractIndex");
  assertU16(possessionManagingContractIndex, "possessionManagingContractIndex");

  const issuerPublicKey32 = params.issuerPublicKey32 ?? new Uint8Array(32);
  const ownerPublicKey32 = params.ownerPublicKey32 ?? new Uint8Array(32);
  const possessorPublicKey32 = params.possessorPublicKey32 ?? new Uint8Array(32);

  if (params.issuerPublicKey32 === undefined) flags |= RequestAssetsFlag.ANY_ISSUER;
  if (params.assetNameU64LE === undefined) flags |= RequestAssetsFlag.ANY_ASSET_NAME;
  if (requestType === RequestAssetsType.OWNERSHIP && params.ownerPublicKey32 === undefined)
    flags |= RequestAssetsFlag.ANY_OWNER;
  if (
    requestType === RequestAssetsType.OWNERSHIP &&
    params.ownershipManagingContractIndex === undefined
  )
    flags |= RequestAssetsFlag.ANY_OWNERSHIP_MANAGING_CONTRACT;
  if (requestType === RequestAssetsType.POSSESSION && params.possessorPublicKey32 === undefined)
    flags |= RequestAssetsFlag.ANY_POSSESSOR;
  if (
    requestType === RequestAssetsType.POSSESSION &&
    params.possessionManagingContractIndex === undefined
  )
    flags |= RequestAssetsFlag.ANY_POSSESSION_MANAGING_CONTRACT;

  assertUint8ArrayLength(issuerPublicKey32, 32, "issuerPublicKey32");
  assertUint8ArrayLength(ownerPublicKey32, 32, "ownerPublicKey32");
  assertUint8ArrayLength(possessorPublicKey32, 32, "possessorPublicKey32");

  const assetNameU64LE = params.assetNameU64LE ?? 0n;
  if (assetNameU64LE < 0n || assetNameU64LE > 0xffff_ffff_ffff_ffffn) {
    throw new RangeError("assetNameU64LE must fit in uint64");
  }

  const payload = new Uint8Array(112);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setUint16(0, requestType, true);
  view.setUint16(2, flags, true);
  view.setUint16(4, ownershipManagingContractIndex, true);
  view.setUint16(6, possessionManagingContractIndex, true);
  payload.set(issuerPublicKey32, 8);
  writeU64LE(assetNameU64LE, payload, 40);
  payload.set(ownerPublicKey32, 48);
  payload.set(possessorPublicKey32, 80);

  return encodeRequestPacket(NetworkMessageType.REQUEST_ASSETS, payload);
}

export function decodeAssetRecord(recordBytes48: Uint8Array): AssetRecord {
  assertUint8ArrayLength(recordBytes48, ASSET_RECORD_SIZE, "recordBytes48");
  const type = recordBytes48[32] ?? 0;
  const view = new DataView(
    recordBytes48.buffer,
    recordBytes48.byteOffset,
    recordBytes48.byteLength,
  );

  if (type === AssetRecordType.ISSUANCE) {
    return {
      type: AssetRecordType.ISSUANCE,
      publicKey32: recordBytes48.slice(0, 32),
      name7: recordBytes48.slice(33, 40),
      numberOfDecimalPlaces: ((recordBytes48[40] ?? 0) << 24) >> 24,
      unitOfMeasurement7: recordBytes48.slice(41, 48),
    };
  }

  if (type === AssetRecordType.OWNERSHIP) {
    return {
      type: AssetRecordType.OWNERSHIP,
      publicKey32: recordBytes48.slice(0, 32),
      managingContractIndex: view.getUint16(34, true),
      issuanceIndex: view.getUint32(36, true),
      numberOfShares: readI64LE(recordBytes48, 40),
    };
  }

  if (type === AssetRecordType.POSSESSION) {
    return {
      type: AssetRecordType.POSSESSION,
      publicKey32: recordBytes48.slice(0, 32),
      managingContractIndex: view.getUint16(34, true),
      ownershipIndex: view.getUint32(36, true),
      numberOfShares: readI64LE(recordBytes48, 40),
    };
  }

  return { type: AssetRecordType.EMPTY, publicKey32: recordBytes48.slice(0, 32) };
}

export function decodeRespondAssets(payload: Uint8Array): RespondAssets {
  if (!(payload instanceof Uint8Array)) throw new TypeError("payload must be a Uint8Array");
  if (payload.byteLength !== RESPOND_ASSETS_PAYLOAD_SIZE) {
    throw new RangeError(`payload must be ${RESPOND_ASSETS_PAYLOAD_SIZE} bytes`);
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const asset = decodeAssetRecord(payload.subarray(0, ASSET_RECORD_SIZE));
  const tick = view.getUint32(48, true);
  const universeIndex = view.getUint32(52, true);

  return { asset, tick, universeIndex };
}

export function decodeRespondAssetsWithSiblings(payload: Uint8Array): RespondAssetsWithSiblings {
  if (!(payload instanceof Uint8Array)) throw new TypeError("payload must be a Uint8Array");
  if (payload.byteLength !== RESPOND_ASSETS_WITH_SIBLINGS_PAYLOAD_SIZE) {
    throw new RangeError(`payload must be ${RESPOND_ASSETS_WITH_SIBLINGS_PAYLOAD_SIZE} bytes`);
  }

  const base = decodeRespondAssets(payload.subarray(0, RESPOND_ASSETS_PAYLOAD_SIZE));
  const siblings: Uint8Array[] = [];
  const siblingsOffset = RESPOND_ASSETS_PAYLOAD_SIZE;
  for (let i = 0; i < ASSETS_DEPTH; i++) {
    const start = siblingsOffset + i * 32;
    siblings.push(payload.slice(start, start + 32));
  }
  return { ...base, siblings };
}
