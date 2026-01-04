import {
  createPacketFramer,
  createTcpTransport,
  decodeRespondEntity,
  encodeRequestEntity,
  NetworkMessageType,
  publicKeyFromIdentity,
} from "../index.ts";

async function main() {
  const identity = "AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ";
  const pubKey32 = publicKeyFromIdentity(identity);

  const transport = await createTcpTransport({ host: "127.0.0.1", port: 21841 });
  const framer = createPacketFramer();

  await transport.write(encodeRequestEntity(pubKey32));

  for await (const chunk of transport.read()) {
    framer.push(chunk);
    for (const pkt of framer.read()) {
      if (pkt.header.type === NetworkMessageType.RESPOND_ENTITY) {
        console.log(decodeRespondEntity(pkt.payload));
        await transport.close();
        return;
      }
    }
  }
}

await main();
