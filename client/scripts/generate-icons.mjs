import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'images', 'icons');
mkdirSync(publicDir, { recursive: true });

const svg = readFileSync(join(__dirname, '..', 'public', 'images', 'logos', 'qna.svg'));

const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

for (const size of sizes) {
  const bg = Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#1e3a5f"/>
  </svg>`);

  const icon = await sharp(svg).resize(Math.round(size * 0.6), Math.round(size * 0.6)).toBuffer();
  const iconBg = await sharp(bg).composite([{ input: icon, gravity: 'center' }]).png().toFile(join(publicDir, `icon-${size}x${size}-qna.png`));
  console.log(`Created icon-${size}x${size}-qna.png`);
}

const favicon = await sharp(svg).resize(32, 32).png().toFile(join(__dirname, '..', 'public', 'favicon.png'));
console.log('Created favicon.png');
console.log('Done');
