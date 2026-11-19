// Packs PNG files into a Windows .ico (each entry stored as PNG, which Windows Vista+ reads).
// Usage: node scripts/make-ico.mjs out.ico 16.png 32.png 48.png 64.png 128.png 256.png
import { readFileSync, writeFileSync } from "node:fs";

const [target, ...sources] = process.argv.slice(2);
const images = sources.map((file) => readFileSync(file));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map((png) => {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += png.length;
  return entry;
});
writeFileSync(target, Buffer.concat([header, ...entries, ...images]));
