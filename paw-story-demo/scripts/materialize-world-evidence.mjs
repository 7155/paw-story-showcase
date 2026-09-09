import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const destination = fileURLToPath(new URL('../public/evidence/', import.meta.url));
mkdirSync(destination, { recursive: true });
copyFileSync(fileURLToPath(new URL('../../showcase/world.v2.json', import.meta.url)), `${destination}/world.v2.json`);
copyFileSync(fileURLToPath(new URL('../../showcase/datasets/lab-world.v2.json', import.meta.url)), `${destination}/lab-world.v2.json`);
