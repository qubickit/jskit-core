import {
  createPacketFramer,
  createTcpTransport,
  decodeRespondCurrentTickInfo,
  encodeRequestCurrentTickInfo,
  NetworkMessageType,
} from "../index.ts";

async function main() {
  const transport = await createTcpTransport({ host: "127.0.0.1", port: 21841 });
  const framer = createPacketFramer();

  await transport.write(encodeRequestCurrentTickInfo());

  for await (const chunk of transport.read()) {
    framer.push(chunk);
    for (const pkt of framer.read()) {
      if (pkt.header.type === NetworkMessageType.RESPOND_CURRENT_TICK_INFO) {
        console.log(decodeRespondCurrentTickInfo(pkt.payload));
        await transport.close();
        return;
      }
    }
  }
}

await main();
