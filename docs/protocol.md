# Protocol

This package contains low-level packet framing and message codecs.

## Framing

- `encodeRequestResponseHeader` / `decodeRequestResponseHeader`
- `createPacketFramer()` → buffers chunks and emits complete `{ header, payload }` packets

## Request packets

- `encodeRequestPacket(type, payload?, { dejavu? })`
- `NetworkMessageType` (subset of message ids used by the implemented codecs)

## Implemented codecs

Tick info:
- `encodeRequestCurrentTickInfo()`
- `decodeRespondCurrentTickInfo(payload)`

Entity:
- `encodeRequestEntity(publicKey32)`
- `decodeRespondEntity(payload)`

System info:
- `encodeRequestSystemInfo()`
- `decodeRespondSystemInfo(payload)`

Broadcast tx:
- `encodeBroadcastTransactionPacket(txBytes)` (forces `dejavu=0`)

Contract function (raw):
- `encodeRequestContractFunction({ contractIndex, inputType, inputBytes })`
- `decodeRespondContractFunction(payload)` (raw bytes)

Tick data:
- `encodeRequestTickData(tick)`
- `decodeBroadcastFutureTickData(payload)` → `TickDataView` (accessors)
- `countNonZeroTransactionDigests(tickData)`

Assets:
- `encodeRequestAssetsByFilter(...)`
- `encodeRequestAssetsByUniverseIndex(...)`
- `decodeRespondAssets(payload)`
- `decodeRespondAssetsWithSiblings(payload)`
- `decodeAssetRecord(record48)`

## Stream helpers

- `readUntilEndResponse(packets, { includeEnd?, allowEof? })`

