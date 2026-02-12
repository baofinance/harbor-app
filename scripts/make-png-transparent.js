#!/usr/bin/env node
/**
 * One-off script: make black background of haGOLD.png transparent.
 * Usage: node scripts/make-png-transparent.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const inputPath = path.join(__dirname, "../public/icons/haGOLD.png");
const outputPath = inputPath;

async function main() {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const BLACK_THRESHOLD = 40;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      data[i + 3] = 0; // set alpha to 0
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log("Done: black background made transparent in", outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
