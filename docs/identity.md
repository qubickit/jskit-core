# Identity

This module handles Qubic identity strings (60 letters) and their conversion to/from 32-byte public keys, including checksum validation.

Exports:
- `identityFromPublicKey(publicKey32, { lowerCase? })`
- `publicKeyFromIdentity(identity60)`
- `verifyIdentity(identity60)`

## Examples

```ts
import { identityFromPublicKey, publicKeyFromIdentity, verifyIdentity } from "jskit-core";

const id = "AFZPUAIYVPNUYGJRQVLUKOPPVLHAZQTGLYAAUUNBXFTVTAMSBKQBLEIEPCVJ";
console.log(verifyIdentity(id)); // true/false

const pub = publicKeyFromIdentity(id);
console.log(identityFromPublicKey(pub)); // same as id (uppercase by default)
```

## Notes

- `publicKeyFromIdentity` throws on invalid format or checksum mismatch.
- `verifyIdentity` is a boolean wrapper around `publicKeyFromIdentity`.

