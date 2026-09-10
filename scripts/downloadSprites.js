import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/sprites');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function downloadSprite(dex) {
  const dest = path.join(outDir, `${dex}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;

  const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
  } catch (e) {
    console.error(`Failed to download dex ${dex}:`, e.message);
  }
}

async function main() {
  console.log('Downloading sprites for dex 1 to 1025...');
  const batchSize = 50;
  for (let i = 1; i <= 1025; i += batchSize) {
    const batch = [];
    for (let j = i; j < i + batchSize && j <= 1025; j++) {
      batch.push(downloadSprite(j));
    }
    await Promise.all(batch);
  }
  console.log('Finished downloading sprites.');
}

main();
