// Run: node scripts/generate-products.js
// Scans public/images/, skips Logo/, and regenerates public/js/products.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../public/images');
const outputFile = path.join(__dirname, '../public/js/products.js');

const SKIP_FOLDERS = ['Logo'];
const IMAGE_EXTS = /\.(png|jpg|jpeg|webp)$/i;

const folders = fs.readdirSync(imagesDir).filter(f =>
  fs.statSync(path.join(imagesDir, f)).isDirectory() && !SKIP_FOLDERS.includes(f)
);

let id = 1;
const products = [];

for (const folder of folders) {
  const files = fs.readdirSync(path.join(imagesDir, folder)).filter(f => IMAGE_EXTS.test(f));
  for (const file of files) {
    const nameWithoutExt = path.basename(file, path.extname(file));
    const name = nameWithoutExt.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const slug = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    products.push({
      id: id++,
      name,
      category: folder,
      image: `images/${folder}/${file}`,
      slug,
    });
  }
}

const output = `// AUTO-GENERATED — do not edit manually.
// To regenerate: node scripts/generate-products.js

const products = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`✅ Generated ${products.length} products → public/js/products.js`);
