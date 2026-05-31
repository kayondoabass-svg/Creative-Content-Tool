import sharp from "sharp";
import fs from "fs";
import path from "path";

async function main() {
  const BASE = path.join(process.cwd(), "public", "flashcard-images");
  const sets = fs.readdirSync(BASE).filter(d => fs.statSync(path.join(BASE, d)).isDirectory());
  let total = 0, savedBytes = 0;

  for (const set of sets) {
    const dir = path.join(BASE, set);
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".png"));
    for (const file of files) {
      const fp = path.join(dir, file);
      const before = fs.statSync(fp).size;
      const buf = await sharp(fp)
        .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(fp, buf);
      savedBytes += before - buf.length;
      total++;
    }
  }
  console.log(`Compressed ${total} images, saved ${Math.round(savedBytes / 1024 / 1024)}MB`);
}

main().catch(e => { console.error(e); process.exit(1); });
