import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourceUrl = new URL("../app/companion-asset.ts", import.meta.url);
const outputUrl = new URL("../public/rag-ime-companion-thinking.png", import.meta.url);
const source = readFileSync(sourceUrl, "utf8");
const match = source.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);

if (!match) {
  throw new Error("Release companion asset payload is missing or malformed.");
}

const bytes = Buffer.from(match[1], "base64");
const signature = bytes.subarray(0, 8).toString("hex");
if (signature !== "89504e470d0a1a0a") {
  throw new Error("Release companion asset is not a PNG.");
}

mkdirSync(fileURLToPath(new URL("../public/", import.meta.url)), { recursive: true });
writeFileSync(fileURLToPath(outputUrl), bytes);
