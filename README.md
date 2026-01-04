# jskit-core

Core, low-level TypeScript building blocks for Qubic: identity conversion, seed/key derivation, transaction build/signing, binary codecs, and transports.

## Install

```bash
bun add jskit-core
```

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

