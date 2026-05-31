/**
 * One-time script: generate all flashcard images and save as static PNG files.
 * Run with: npx tsx scripts/generate-flashcard-images.ts
 * Images are saved to public/flashcard-images/{setId}/{word}.png
 * Skips words that already have a file.
 */

import { generateGeminiImage } from "../server/geminiImageService";
import * as fs from "fs";
import * as path from "path";

const SETS = [
  { id: "animals",    words: ["cat","dog","bird","fish","elephant","lion","giraffe","monkey","rabbit","horse"] },
  { id: "numbers",   words: ["one","two","three","four","five","six","seven","eight","nine","ten"] },
  { id: "colors",    words: ["red","blue","green","yellow","orange","purple","pink","white"] },
  { id: "shapes",    words: ["circle","square","triangle","rectangle","star","heart","diamond","oval"] },
  { id: "fruits",    words: ["apple","banana","orange","strawberry","mango","grapes","watermelon","pineapple"] },
  { id: "vegetables",words: ["carrot","broccoli","tomato","potato","onion","corn","pea","mushroom"] },
  { id: "weather",   words: ["sunny","cloudy","rainy","snowy","windy","stormy","foggy","rainbow"] },
  { id: "body",      words: ["head","eyes","nose","mouth","ears","hands","feet","arms"] },
  { id: "classroom", words: ["pencil","book","ruler","eraser","scissors","bag","desk","chair"] },
  { id: "transport", words: ["car","bus","airplane","boat","bicycle","train","truck","helicopter"] },
  { id: "clothes",   words: ["shirt","pants","dress","shoes","hat","jacket","socks","gloves"] },
  { id: "actions",   words: ["run","jump","eat","sleep","read","write","sing","dance"] },
  { id: "days",      words: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] },
  { id: "food",      words: ["bread","milk","egg","juice","rice","soup","cheese","pizza"] },
];

const OUT = path.join(process.cwd(), "public", "flashcard-images");

async function generateOne(setId: string, word: string): Promise<boolean> {
  const dir = path.join(OUT, setId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${word.toLowerCase()}.png`);

  if (fs.existsSync(file)) {
    console.log(`  ⏭  skip  ${setId}/${word}`);
    return true;
  }

  const prompt = `Simple, bright, colorful cartoon illustration of "${word}" on a plain white background. Child-friendly educational flashcard style. No text, letters, numbers, labels or captions anywhere in the image. Clean, minimal, cute.`;

  try {
    const result = await generateGeminiImage(prompt);
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      console.warn(`  ✗  no image  ${setId}/${word}`);
      return false;
    }
    fs.writeFileSync(file, Buffer.from(b64, "base64"));
    console.log(`  ✓  saved    ${setId}/${word}`);
    return true;
  } catch (e: any) {
    console.error(`  ✗  error    ${setId}/${word}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("BrightBoard — Flashcard image pre-generator");
  console.log(`Output: ${OUT}\n`);

  let total = 0, done = 0, failed = 0;

  for (const set of SETS) {
    console.log(`\n── ${set.id} (${set.words.length} words) ──`);
    // Generate 3 at a time to avoid rate limits
    for (let i = 0; i < set.words.length; i += 3) {
      const batch = set.words.slice(i, i + 3);
      const results = await Promise.all(batch.map(w => generateOne(set.id, w)));
      total += results.length;
      done += results.filter(Boolean).length;
      failed += results.filter(r => !r).length;
      // Small pause between batches
      if (i + 3 < set.words.length) await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n✅ Done: ${done}/${total} images saved, ${failed} failed`);
  console.log(`\nNext steps:`);
  console.log(`  git add public/flashcard-images`);
  console.log(`  git commit -m "Add pre-generated flashcard images"`);
  console.log(`  git push`);
}

main().catch(e => { console.error(e); process.exit(1); });
