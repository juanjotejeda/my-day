// Home-screen icons from public/icon-source.png. Run: pnpm icons
import sharp from "sharp";

const src = "public/icon-source.png";
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

// The browser tab icon, since Next serves app/favicon.ico when it exists.
await sharp(src).resize(32, 32).png().toFile("public/favicon.png");
console.log("public/favicon.png 32x32");
