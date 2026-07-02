// Gera os PNGs do PWA a partir de assets/icon.svg
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

const svg = readFileSync(new URL("../assets/icon.svg", import.meta.url));
mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });

const out = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));

const jobs = [
  ["icons/icon-192.png", 192],
  ["icons/icon-512.png", 512],
  ["icons/apple-touch-icon.png", 180],
  ["favicon.png", 48],
];

for (const [file, size] of jobs) {
  await sharp(svg).resize(size, size).png().toFile(out(file));
  console.log("ok", file, size);
}
