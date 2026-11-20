// Home-screen icons from public/icon.svg. Run: pnpm icons
import sharp from "sharp";

const src = "public/icon.svg";
const sizes = [
  [192, "public/icon-192.png"],
  [512, "public/icon-512.png"],
  [512, "public/icon-512-maskable.png"],
  [180, "public/apple-touch-icon.png"],
];

for (const [size, out] of sizes) {
  await sharp(src).resize(size, size).png().toFile(out);
  console.log(`${out} ${size}x${size}`);
}
