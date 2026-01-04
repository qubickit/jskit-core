# Seed & Keys

Seed-based wallet helpers.

Exports:
- `SEED_LENGTH` (55)
- `privateKeyFromSeed(seed, index?)`
- `publicKeyFromSeed(seed, index?)`
- `identityFromSeed(seed, index?)`

## Seed format

- Exactly 55 lowercase letters `a-z`
- `index` is the same “incrementing preimage” mechanism used by the reference TS implementation.

## Examples

```ts
import { identityFromSeed, privateKeyFromSeed, publicKeyFromSeed } from "@qubic-lib/jskit-core";

const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
console.log(await identityFromSeed(seed));
console.log(await publicKeyFromSeed(seed));     // Uint8Array(32)
console.log(await privateKeyFromSeed(seed, 0)); // Uint8Array(32)
```
