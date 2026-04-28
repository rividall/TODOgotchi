import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const path = process.argv[2];
const png = PNG.sync.read(readFileSync(path));
console.log(`${path}: ${png.width} × ${png.height} px`);
