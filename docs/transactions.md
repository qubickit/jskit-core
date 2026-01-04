# Transactions

Helpers for building, hashing, signing, and identifying transactions.

Exports:
- `buildUnsignedTransaction({ sourcePublicKey32, destinationPublicKey32, amount, tick, inputType?, inputBytes? })`
- `unsignedTransactionDigest(unsignedTxBytes)` (K12, 32 bytes)
- `signTransaction(unsignedTxBytes, secretKey32)` (signature 64 bytes)
- `buildSignedTransaction(params, secretKey32)`
- `transactionDigest(txBytes)` (K12, 32 bytes; includes signature)
- `transactionId(txBytes)` (identity derived from digest, lowercase)

Constants:
- `TRANSACTION_HEADER_SIZE` (80)
- `SIGNATURE_LENGTH` (64)
- `MAX_TRANSACTION_SIZE` (1024)
- `MAX_INPUT_SIZE` (`MAX_TRANSACTION_SIZE - (TRANSACTION_HEADER_SIZE + SIGNATURE_LENGTH)`)

## Example

```ts
import { buildSignedTransaction, privateKeyFromSeed, publicKeyFromIdentity, identityFromSeed } from "jskit-core";

const seed = "jvhbyzjinlyutyuhsweuxiwootqoevjqwqmdhjeohrytxjxidpbcfyg";
const secretKey32 = await privateKeyFromSeed(seed);
const sourcePublicKey32 = publicKeyFromIdentity(await identityFromSeed(seed));
const destinationPublicKey32 = publicKeyFromIdentity("AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ");

const txBytes = await buildSignedTransaction(
  { sourcePublicKey32, destinationPublicKey32, amount: 1n, tick: 12345 },
  secretKey32,
);
```

