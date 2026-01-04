import type { Packet } from "./packet-framer.js";

export const END_RESPONSE_TYPE = 35;

export type ReadUntilEndResponseOptions = Readonly<{
  endType?: number;
  includeEnd?: boolean;
  allowEof?: boolean;
  signal?: AbortSignal;
}>;

function toAbortError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

export async function* readUntilEndResponse(
  packets: AsyncIterable<Packet>,
  options: ReadUntilEndResponseOptions = {},
): AsyncGenerator<Packet> {
  const endType = options.endType ?? END_RESPONSE_TYPE;
  const includeEnd = options.includeEnd ?? false;
  const allowEof = options.allowEof ?? false;
  const signal = options.signal;

  if (signal?.aborted) {
    throw toAbortError(signal.reason);
  }

  for await (const packet of packets) {
    if (signal?.aborted) {
      throw toAbortError(signal.reason);
    }

    if (packet.header.type === endType) {
      if (includeEnd) yield packet;
      return;
    }

    yield packet;
  }

  if (!allowEof) {
    throw new Error(`Stream ended before terminator (type=${endType})`);
  }
}
