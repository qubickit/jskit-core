import {
  buildSignedTransaction,
  createTcpTransport,
  encodeBroadcastTransactionPacket,
  identityFromSeed,
  privateKeyFromSeed,
  publicKeyFromIdentity,
} from "../index.ts";

async function main() {
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
  const transport = await createTcpTransport({ host: "127.0.0.1", port: 21841 });
  await transport.write(packet);
  await transport.close();
}

await main();
