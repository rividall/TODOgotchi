// Build a PixiJS-compatible JSON sidecar from an Aseprite source + existing PNG spritesheet.
//
// Why this exists: ase-parser fails on the older .ase format used by ScissorMarks'
// DinoSprites, but a focused tag-only parser handles it fine. The PNG already has
// every frame laid out as a horizontal strip, so all we need to write is the JSON
// that maps PixiJS frame names to (x, y, w, h) rectangles + tag-named animations.
//
// Usage:
//   node scripts/build-spritesheet.mjs <basename> <ase-path> <png-path>
//
// Example:
//   node scripts/build-spritesheet.mjs vita \
//     src/assets/worlds/forest/creatures/DinoSprites.ase \
//     src/assets/worlds/forest/creatures/DinoSprites_vita.png

import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const [, , basename, asePath, pngPath] = process.argv;
if (!basename || !asePath || !pngPath) {
  console.error("usage: node scripts/build-spritesheet.mjs <basename> <ase-path> <png-path>");
  process.exit(1);
}
const outJson = pngPath.replace(/\.png$/i, ".json");

// ---------- Minimal .ase tag-chunk reader -------------------------------------
//
// File spec: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
// We only need: canvas size, frame count, frame durations, and Tag chunks (0x2018).
function readAse(asePathLocal) {
  const buf = readFileSync(asePathLocal);
  let off = 0;
  const u16 = () => {
    const v = buf.readUInt16LE(off);
    off += 2;
    return v;
  };
  const u32 = () => {
    const v = buf.readUInt32LE(off);
    off += 4;
    return v;
  };
  const skip = (n) => {
    off += n;
  };
  const str = () => {
    const len = u16();
    const s = buf.slice(off, off + len).toString("utf8");
    off += len;
    return s;
  };

  // Header (128 bytes)
  u32(); // file size
  if (u16() !== 0xa5e0) throw new Error("not an Aseprite file (bad magic)");
  const numFrames = u16();
  const width = u16();
  const height = u16();
  u16(); // color_depth
  u32(); // flags
  u16(); // speed (deprecated)
  u32(); // reserved
  u32(); // reserved
  skip(100); // tail of header

  const tags = [];
  const frameDurations = [];

  for (let f = 0; f < numFrames; f++) {
    const frameStart = off;
    const frameBytes = u32();
    if (u16() !== 0xf1fa) throw new Error(`frame ${f}: bad magic`);
    const chunksOld = u16();
    const duration = u16();
    frameDurations.push(duration || 100);
    skip(2); // reserved
    const chunksNew = u32();
    const numChunks = chunksNew !== 0 ? chunksNew : chunksOld;

    for (let c = 0; c < numChunks; c++) {
      const chunkStart = off;
      const chunkSize = u32();
      const chunkType = u16();
      if (chunkType === 0x2018) {
        const numTags = u16();
        skip(8); // reserved
        for (let t = 0; t < numTags; t++) {
          const from = u16();
          const to = u16();
          const loopDir = buf.readUInt8(off);
          off += 1;
          skip(8); // reserved
          skip(3); // tag color RGB
          skip(1); // reserved
          const name = str();
          tags.push({ name, from, to, loopDir });
        }
      }
      off = chunkStart + chunkSize;
    }
    off = frameStart + frameBytes;
  }

  return { numFrames, width, height, frameDurations, tags };
}

// ---------- Build PixiJS Spritesheet JSON sidecar -----------------------------
function buildJson(basenameLocal, frameW, frameH, numFrames, frameDurations, tags, imageFile) {
  const frames = {};
  for (let i = 0; i < numFrames; i++) {
    frames[`${basenameLocal}_${i}`] = {
      frame: { x: i * frameW, y: 0, w: frameW, h: frameH },
      sourceSize: { w: frameW, h: frameH },
      spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
      rotated: false,
      trimmed: false,
      duration: frameDurations[i] ?? 100,
    };
  }
  const animations = {};
  if (tags.length === 0) {
    animations.all = Array.from({ length: numFrames }, (_, i) => `${basenameLocal}_${i}`);
  } else {
    for (const t of tags) {
      if (t.from >= numFrames) continue;
      const to = Math.min(t.to, numFrames - 1);
      const seq = [];
      for (let i = t.from; i <= to; i++) seq.push(`${basenameLocal}_${i}`);
      animations[t.name] = seq;
    }
  }
  return {
    frames,
    meta: {
      app: "poringField/build-spritesheet.mjs",
      version: "1.0",
      image: imageFile,
      format: "RGBA8888",
      size: { w: frameW * numFrames, h: frameH },
      scale: "1",
    },
    animations,
  };
}

// ---------- Run ---------------------------------------------------------------
const aseInfo = readAse(asePath);
const png = PNG.sync.read(readFileSync(pngPath));

console.log(`ASE: ${aseInfo.numFrames} frames @ ${aseInfo.width}×${aseInfo.height}`);
console.log(`PNG: ${png.width}×${png.height}`);

// Verify the PNG is a horizontal strip whose frame size matches the .ase.
const stripFrames = png.width / aseInfo.width;
if (
  png.height !== aseInfo.height ||
  png.width % aseInfo.width !== 0 ||
  stripFrames !== aseInfo.numFrames
) {
  console.warn(
    `⚠  PNG layout doesn't look like a horizontal strip matching .ase. ` +
      `Got ${png.width}×${png.height}, expected ${aseInfo.width * aseInfo.numFrames}×${aseInfo.height}. ` +
      `Continuing — JSON will index into a horizontal strip; verify visually.`,
  );
}

console.log(`Tags: ${aseInfo.tags.length}`);
aseInfo.tags.forEach((t) => console.log(`  "${t.name}"  frames ${t.from}–${t.to}`));

const json = buildJson(
  basename,
  aseInfo.width,
  aseInfo.height,
  aseInfo.numFrames,
  aseInfo.frameDurations,
  aseInfo.tags,
  pngPath.split("/").pop(),
);
writeFileSync(outJson, JSON.stringify(json, null, 2));
console.log(`\n✓ Wrote ${outJson}`);
