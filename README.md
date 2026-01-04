# jskit-core

Core, low-level TypeScript building blocks for Qubic: identity conversion, seed/key derivation, transaction build/signing, binary codecs, and transports.

## Documentation

- Feature docs: `docs/README.md`
- Examples: `examples/README.md`

### Feature pages

- Identity: `docs/identity.md`
- Seed & keys: `docs/seed-and-keys.md`
- Transactions: `docs/transactions.md`
- Protocol & codecs: `docs/protocol.md`
- Transports: `docs/transports.md`

## Install

```bash
bun add jskit-core
```

## API Overview

### Identity

- `identityFromPublicKey(publicKey32, { lowerCase? })`
- `publicKeyFromIdentity(identity60)`
- `verifyIdentity(identity60)`

### Seed & keys

- `SEED_LENGTH`
- `privateKeyFromSeed(seed, index?)`
- `publicKeyFromSeed(seed, index?)`
- `identityFromSeed(seed, index?)`

### Transactions

- `buildUnsignedTransaction(...)`
- `unsignedTransactionDigest(unsignedTxBytes)`
- `signTransaction(unsignedTxBytes, secretKey32)`
- `buildSignedTransaction(...)`
- `transactionDigest(txBytes)`
- `transactionId(txBytes)`
- Constants: `TRANSACTION_HEADER_SIZE`, `SIGNATURE_LENGTH`, `MAX_TRANSACTION_SIZE`, `MAX_INPUT_SIZE`

### Protocol & codecs

- Framing: `createPacketFramer`, `encodeRequestResponseHeader`, `decodeRequestResponseHeader`
- Requests: `encodeRequestPacket`, `NetworkMessageType`
- Tick info: `encodeRequestCurrentTickInfo`, `decodeRespondCurrentTickInfo`
- Entity: `encodeRequestEntity`, `decodeRespondEntity`
- System info: `encodeRequestSystemInfo`, `decodeRespondSystemInfo`
- Contract function: `encodeRequestContractFunction`, `decodeRespondContractFunction`
- Broadcast tx: `encodeBroadcastTransactionPacket`
- Tick data: `encodeRequestTickData`, `decodeBroadcastFutureTickData`, `countNonZeroTransactionDigests`
- Assets: `encodeRequestAssetsByFilter`, `encodeRequestAssetsByUniverseIndex`, `decodeRespondAssets`, `decodeRespondAssetsWithSiblings`, `decodeAssetRecord`
- Stream helper: `readUntilEndResponse`

### Transports

- `createTcpTransport({ host, port, signal? })` (Node)
- `createBridgeTransport({ url, signal?, WebSocketImpl? })` (browser/WebSocket bridge)

## Usage

### Derive identity from seed

```ts
import { identityFromSeed } from "jskit-core";

const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
console.log(await identityFromSeed(seed));
```

### Build + sign + broadcast a transaction (Node TCP)

```ts
import {
  buildSignedTransaction,
  createTcpTransport,
  encodeBroadcastTransactionPacket,
  identityFromSeed,
  privateKeyFromSeed,
  publicKeyFromIdentity,
} from "jskit-core";

const host = "127.0.0.1";
const port = 21841;

const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
const sourceIdentity = await identityFromSeed(seed);
const secretKey32 = await privateKeyFromSeed(seed);
const sourcePublicKey32 = publicKeyFromIdentity(sourceIdentity);
const destinationPublicKey32 = publicKeyFromIdentity(
  "AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ",
);

const tick = 12345;
const txBytes = await buildSignedTransaction(
  { sourcePublicKey32, destinationPublicKey32, amount: 1n, tick },
  secretKey32,
);

const packet = encodeBroadcastTransactionPacket(txBytes);
const transport = await createTcpTransport({ host, port });
await transport.write(packet);
await transport.close();
```

### Request current tick info

```ts
import {
  createPacketFramer,
  createTcpTransport,
  decodeRespondCurrentTickInfo,
  encodeRequestCurrentTickInfo,
  NetworkMessageType,
} from "jskit-core";

const transport = await createTcpTransport({ host: "127.0.0.1", port: 21841 });
const framer = createPacketFramer();

await transport.write(encodeRequestCurrentTickInfo());

for await (const chunk of transport.read()) {
  framer.push(chunk);
  for (const pkt of framer.read()) {
    if (pkt.header.type === NetworkMessageType.RESPOND_CURRENT_TICK_INFO) {
      console.log(decodeRespondCurrentTickInfo(pkt.payload));
      await transport.close();
      break;
    }
  }
}
```

## Browser / bridge transport

If you have a WebSocket bridge that forwards binary frames to a Qubic node TCP connection, you can use:

```ts
import { createBridgeTransport } from "jskit-core";

const transport = await createBridgeTransport({ url: "wss://bridge.example/ws" });
```
