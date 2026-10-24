// Copies the web catalog and brand artwork into the iOS and Android apps.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const web = path.join(root, 'web-app');
const ios = path.join(root, 'ios-app/Dalmia');
const android = path.join(root, 'android-app/app/src/main');
const write = async (file, content) => {await mkdir(path.dirname(file), {recursive: true}); await writeFile(file, content);};

const catalog = JSON.parse(await readFile(path.join(web, 'data/catalog.json'), 'utf8'));
const products = catalog.products.map(({catalogText, ...product}) => product);
const bundled = JSON.stringify({products, documents: catalog.documents, priceNote: catalog.priceNote}) + '\n';
await write(path.join(ios, 'catalog.json'), bundled);
await write(path.join(android, 'assets/catalog.json'), bundled);

// Android has no SVG support, so the brochure paths become vector drawables.
function vectorDrawable(svg) {
  const [x, y, width, height] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map(match => {
    const evenOdd = /fill-rule="evenodd"/.test(match[0]);
    return `    <path android:fillColor="#FFFFFF"${evenOdd ? ' android:fillType="evenOdd"' : ''} android:pathData="${match[1]}"/>`;
  });
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${width}dp" android:height="${height}dp" android:viewportWidth="${width}" android:viewportHeight="${height}">
  <group android:translateX="${-x}" android:translateY="${-y}">
${paths.join('\n')}
  </group>
</vector>
`;
}

for (const [name, file] of [['Wordmark', 'dalmia-wordmark.svg'], ['Monogram', 'dalmia-monogram.svg']]) {
  const svg = await readFile(path.join(web, 'public/assets', file), 'utf8');
  const imageset = path.join(ios, `Assets.xcassets/${name}.imageset`);
  await write(path.join(imageset, file), svg);
  await write(path.join(imageset, 'Contents.json'), JSON.stringify({
    images: [{filename: file, idiom: 'universal'}],
    info: {author: 'xcode', version: 1},
    properties: {'preserves-vector-representation': true},
  }, null, 2) + '\n');
  await write(path.join(android, `res/drawable/${name.toLowerCase()}.xml`), vectorDrawable(svg));
}
console.log(`Copied ${products.length} catalog records into ios-app and android-app.`);
