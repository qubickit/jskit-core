import { MAX_TRANSACTION_SIZE, TRANSACTION_HEADER_SIZE } from "../transactions/transaction.js";
import { NetworkMessageType } from "./message-types.js";
import { encodeRequestPacket } from "./request-packet.js";

export function encodeBroadcastTransactionPacket(txBytes: Uint8Array): Uint8Array {
  if (!(txBytes instanceof Uint8Array)) {
    throw new TypeError("txBytes must be a Uint8Array");
  }
  if (txBytes.byteLength < TRANSACTION_HEADER_SIZE) {
    throw new RangeError("txBytes is too short");
  }
  if (txBytes.byteLength > MAX_TRANSACTION_SIZE) {
    throw new RangeError(`txBytes must be <= ${MAX_TRANSACTION_SIZE} bytes`);
  }

  return encodeRequestPacket(NetworkMessageType.BROADCAST_TRANSACTION, txBytes, { dejavu: 0 });
}
