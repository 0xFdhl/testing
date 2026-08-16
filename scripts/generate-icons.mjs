import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const source = "public/icons/icon-source.svg";

await sharp(source).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(source).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(source)
  .resize(512, 512)
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: "#09090b" })
  .png()
  .toFile("public/icons/icon-512-maskable.png");
await sharp(source).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");

console.log("PWA icons generated");