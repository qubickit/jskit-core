import { describe, expect, it } from "bun:test";
import { identityFromSeed } from "./seed.js";

describe("seed", () => {
  it("derives the expected identity from a known seed", async () => {
    const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
    const identity = await identityFromSeed(seed);
    expect(identity).toBe("HZEBBDSKZRTAWGYMTTSDZQDXYWPBUKBEAIYZNFLVWARZJBEBIJRRFKUDVETA");
  });
});
