// Quick recon: print what's inside an .ase file so we know how to render it.
//   node scripts/inspect-ase.mjs <path-to-.ase>
import { readFileSync } from "node:fs";
import Aseprite from "ase-parser";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/inspect-ase.mjs <path-to-.ase>");
  process.exit(1);
}

const buf = readFileSync(path);
const ase = new Aseprite(buf, path);
ase.parse();

console.log(`File:        ${path}`);
console.log(`Canvas:      ${ase.width} × ${ase.height}`);
console.log(`Color depth: ${ase.colorDepth}-bit`);
console.log(`Frames:      ${ase.numFrames}`);
console.log(`Layers:      ${ase.layers.length}`);
ase.layers.forEach((l, i) => console.log(`  [${i}] ${l.name} (opacity ${l.opacity}, visible ${(l.flags & 1) === 1})`));
console.log(`Tags (animation segments): ${ase.tags.length}`);
ase.tags.forEach((t, i) =>
  console.log(`  [${i}] "${t.name}"  frames ${t.from}–${t.to}  direction=${t.animDirection}`),
);
console.log(`Slices: ${ase.slices.length}`);
console.log(`Palette colors: ${ase.palette?.colors?.length ?? "n/a"}`);
console.log(`First frame duration: ${ase.frames[0]?.frameDuration} ms`);
