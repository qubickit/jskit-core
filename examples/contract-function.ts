import {
  createPacketFramer,
  createTcpTransport,
  decodeRespondContractFunction,
  encodeRequestContractFunction,
  NetworkMessageType,
} from "../index.ts";

async function main() {
  const transport = await createTcpTransport({ host: "127.0.0.1", port: 21841 });
  const framer = createPacketFramer();

  const request = encodeRequestContractFunction({
    contractIndex: 0,
    inputType: 0,
    inputBytes: new Uint8Array(),
  });

  await transport.write(request);

  for await (const chunk of transport.read()) {
    framer.push(chunk);
    for (const pkt of framer.read()) {
      if (pkt.header.type === NetworkMessageType.RESPOND_CONTRACT_FUNCTION) {
        const data = decodeRespondContractFunction(pkt.payload);
        console.log(data);
        await transport.close();
        return;
      }
    }
  }
}

await main();
