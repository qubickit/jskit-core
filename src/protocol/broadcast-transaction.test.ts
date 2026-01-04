import { describe, expect, it } from "bun:test";
import { privateKeyFromSeed } from "../crypto/seed.js";
import { publicKeyFromIdentity } from "../primitives/identity.js";
import { buildSignedTransaction } from "../transactions/transaction.js";
import { encodeBroadcastTransactionPacket } from "./broadcast-transaction.js";
import { NetworkMessageType } from "./message-types.js";
import { decodeRequestResponseHeader } from "./request-response-header.js";

describe("broadcast-transaction", () => {
  it("encodes a BROADCAST_TRANSACTION packet with dejavu=0", async () => {
    const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
    const secretKey32 = await privateKeyFromSeed(seed);

    const sourcePublicKey32 = publicKeyFromIdentity(
      "HZEBBDSKZRTAWGYMTTSDZQDXYWPBUKBEAIYZNFLVWARZJBEBIJRRFKUDVETA",
    );
    const destinationPublicKey32 = publicKeyFromIdentity(
      "AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ",
    );

    const txBytes = await buildSignedTransaction(
      { sourcePublicKey32, destinationPublicKey32, amount: 1n, tick: 12345 },
      secretKey32,
    );

    const packet = encodeBroadcastTransactionPacket(txBytes);
    const header = decodeRequestResponseHeader(packet.subarray(0, 8));

    expect(header.size).toBe(8 + txBytes.byteLength);
    expect(header.type).toBe(NetworkMessageType.BROADCAST_TRANSACTION);
    expect(header.dejavu).toBe(0);
    expect(packet.subarray(8)).toEqual(txBytes);
  });
});
