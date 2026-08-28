import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../../control-center-web/dist/", import.meta.url));
const destination = fileURLToPath(new URL("../public/pawos/", import.meta.url));

if (process.argv.includes("--clean")) {
  rmSync(destination, { force: true, recursive: true });
  process.exit(0);
}

if (!existsSync(join(source, "index.html"))) {
  throw new Error("The public PAWOS build is missing. Build ../control-center-web first.");
}

rmSync(destination, { force: true, recursive: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
