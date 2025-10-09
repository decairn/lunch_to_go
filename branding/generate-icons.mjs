import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('../app/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = dirname(__dirname);
const svgPath = resolve(__dirname, 'icon.svg');
const outputs = {
  webPng: resolve(root, 'app/public/icon-512.png'),
  webSvg: resolve(root, 'app/public/icon.svg'),
  faviconPng: resolve(root, 'app/public/favicon.png'),
  tauriBase: resolve(__dirname, 'icon-1024.png')
};

await fs.copyFile(svgPath, outputs.webSvg);

await sharp(svgPath).resize(512, 512).png({ compressionLevel: 9 }).toFile(outputs.webPng);
await sharp(svgPath).resize(256, 256).png({ compressionLevel: 9 }).toFile(outputs.faviconPng);
await sharp(svgPath).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(outputs.tauriBase);

console.log('Generated icon assets at', outputs);
