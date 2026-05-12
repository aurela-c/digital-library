import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveProtoPath(filename) {
  const monorepo = path.join(__dirname, "../../proto", filename);
  const docker = path.join(__dirname, "../proto", filename);
  if (fs.existsSync(monorepo)) return monorepo;
  if (fs.existsSync(docker)) return docker;
  return monorepo;
}
