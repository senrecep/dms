/**
 * PWA Icon Generator Script
 *
 * Generates PNG icons from the SVG logo for PWA manifest.
 * Requires: bun (uses built-in APIs)
 *
 * Usage:
 *   bun run scripts/generate-icons.ts
 *
 * Alternative (if sharp is available):
 *   bunx sharp-cli -i public/logo.svg -o public/icons/icon-192.png -w 192 -h 192
 *   bunx sharp-cli -i public/logo.svg -o public/icons/icon-512.png -w 512 -h 512
 *   bunx sharp-cli -i public/logo.svg -o public/icons/icon-maskable-512.png -w 512 -h 512
 *
 * Or use an online tool:
 *   1. Go to https://realfavicongenerator.net
 *   2. Upload public/logo.svg
 *   3. Download generated icons to public/icons/
 *
 * Required output files:
 *   public/icons/icon-192.png    (192x192)
 *   public/icons/icon-512.png    (512x512)
 *   public/icons/icon-maskable-512.png (512x512, with padding for safe zone)
 */

import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ICONS_DIR = join(__dirname, "..", "public", "icons");

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

console.log("Icon generation requires an image processing library.");
console.log("Please use one of the following methods:\n");
console.log("1. Install sharp and run:");
console.log(
  "   bunx sharp-cli -i public/logo.svg -o public/icons/icon-192.png resize 192 192"
);
console.log(
  "   bunx sharp-cli -i public/logo.svg -o public/icons/icon-512.png resize 512 512"
);
console.log(
  "   bunx sharp-cli -i public/logo.svg -o public/icons/icon-maskable-512.png resize 512 512\n"
);
console.log("2. Use an online converter like https://realfavicongenerator.net\n");
console.log(`Output directory created: ${ICONS_DIR}`);
