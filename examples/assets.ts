import {
  createPacketFramer,
  createTcpTransport,
  decodeRespondAssets,
  decodeRespondAssetsWithSiblings,
  encodeRequestAssetsByUniverseIndex,
  NetworkMessageType,
} from "../index.ts";

async function main() {
  const transport = await createTcpTransport({ host: "127.0.0.1", port: 21841 });
  const framer = createPacketFramer();

  const request = encodeRequestAssetsByUniverseIndex({ universeIndex: 0, getSiblings: true });
  await transport.write(request);

  for await (const chunk of transport.read()) {
    framer.push(chunk);
    for (const pkt of framer.read()) {
      if (pkt.header.type === NetworkMessageType.RESPOND_ASSETS) {
        if (pkt.payload.byteLength === 56) console.log(decodeRespondAssets(pkt.payload));
        else console.log(decodeRespondAssetsWithSiblings(pkt.payload));
      }
      if (pkt.header.type === NetworkMessageType.END_RESPONSE) {
        await transport.close();
        return;
      }
    }
  }
}

await main();
