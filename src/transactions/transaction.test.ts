import { describe, expect, it } from "bun:test";
import { verify } from "../crypto/schnorrq.js";
import { privateKeyFromSeed } from "../crypto/seed.js";
import { publicKeyFromIdentity } from "../primitives/identity.js";
import {
  buildSignedTransaction,
  buildUnsignedTransaction,
  SIGNATURE_LENGTH,
  TRANSACTION_HEADER_SIZE,
  transactionId,
  unsignedTransactionDigest,
} from "./transaction.js";

describe("transaction", () => {
  it("encodes the transaction header correctly", () => {
    const sourcePublicKey32 = new Uint8Array(32).fill(1);
    const destinationPublicKey32 = new Uint8Array(32).fill(2);
    const amount = 123n;
    const tick = 456;

    const unsigned = buildUnsignedTransaction({
      sourcePublicKey32,
      destinationPublicKey32,
      amount,
      tick,
      inputType: 0,
      inputBytes: new Uint8Array(),
    });

    expect(unsigned.byteLength).toBe(TRANSACTION_HEADER_SIZE);
    expect(unsigned.subarray(0, 32)).toEqual(sourcePublicKey32);
    expect(unsigned.subarray(32, 64)).toEqual(destinationPublicKey32);

    const view = new DataView(unsigned.buffer, unsigned.byteOffset, unsigned.byteLength);
    expect(view.getBigInt64(64, true)).toBe(amount);
    expect(view.getUint32(72, true)).toBe(tick);
    expect(view.getUint16(76, true)).toBe(0);
    expect(view.getUint16(78, true)).toBe(0);
  });

  it("signs and verifies a simple transfer transaction", async () => {
    const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
    const destId = "AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ";

    const secretKey32 = await privateKeyFromSeed(seed);
    const destinationPublicKey32 = publicKeyFromIdentity(destId);
    const sourcePublicKey32 = publicKeyFromIdentity(
      "HZEBBDSKZRTAWGYMTTSDZQDXYWPBUKBEAIYZNFLVWARZJBEBIJRRFKUDVETA",
    );

    const unsigned = buildUnsignedTransaction({
      sourcePublicKey32,
      destinationPublicKey32,
      amount: 1n,
      tick: 12345,
    });

    const digest32 = await unsignedTransactionDigest(unsigned);
    expect(digest32.byteLength).toBe(32);

    const signed = await buildSignedTransaction(
      {
        sourcePublicKey32,
        destinationPublicKey32,
        amount: 1n,
        tick: 12345,
      },
      secretKey32,
    );

    expect(signed.byteLength).toBe(TRANSACTION_HEADER_SIZE + SIGNATURE_LENGTH);

    const signature64 = signed.subarray(signed.byteLength - SIGNATURE_LENGTH);
    expect(verify(sourcePublicKey32, digest32, signature64)).toBe(1);

    const id = await transactionId(signed);
    expect(id.length).toBe(60);
  });
});
