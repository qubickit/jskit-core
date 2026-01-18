import { readFile } from "node:fs/promises";

const browserModule = await import("@qubic-labs/core");
if ("createTcpTransport" in browserModule) {
  throw new Error("Browser build should not export createTcpTransport.");
}

const browserBundle = await readFile(new URL("../dist/index.browser.js", import.meta.url), "utf8");
if (browserBundle.includes("node:net")) {
  throw new Error("Browser build should not reference node:net.");
}

console.log("Browser build verification passed.");
