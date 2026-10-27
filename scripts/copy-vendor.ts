/** MapLibre v6 loads its worker as a separate ES module; serve it from public/vendor. */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../src/lib/data-fs";

const src = path.join(ROOT, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const dst = path.join(ROOT, "public/vendor/maplibre-gl-worker.mjs");
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log("copied maplibre worker");
