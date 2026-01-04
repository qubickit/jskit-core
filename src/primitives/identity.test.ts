import { describe, expect, it } from "bun:test";
import { identityFromPublicKey, publicKeyFromIdentity, verifyIdentity } from "./identity.js";

describe("identity", () => {
  it("matches the known empty address for zero pubkey (uppercase)", () => {
    const zero = new Uint8Array(32);
    expect(identityFromPublicKey(zero)).toBe(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB",
    );
  });

  it("supports lowercase identities", () => {
    const zero = new Uint8Array(32);
    expect(identityFromPublicKey(zero, { lowerCase: true })).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaafxib",
    );
  });

  it("roundtrips identity -> pubkey -> identity", () => {
    const ids = [
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB",
      "AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ",
      "XPXYKFLGSWRHRGAUKWFWVXCDVEYAPCPCNUTMUDWFGDYQCWZNJMWFZEEGCFFO",
    ];

    for (const id of ids) {
      const pub = publicKeyFromIdentity(id);
      const back = identityFromPublicKey(pub, { lowerCase: false });
      expect(back).toBe(id);
      expect(verifyIdentity(id)).toBe(true);
    }
  });

  it("rejects checksum mismatch", () => {
    const id = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB";
    const bad = `${id.slice(0, 59)}A`;
    expect(verifyIdentity(bad)).toBe(false);
    expect(() => publicKeyFromIdentity(bad)).toThrow();
  });
});
