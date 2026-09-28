import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {catalogMediaURL} from '../web-app/lib/media.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'web-app/data/catalog.json'), 'utf8'));
const paths = new Set(catalog.products.flatMap(product => product.images.flatMap(image => [image.src, image.detail])));
for (const page of catalog.pages) paths.add(page.image);
for (const document of catalog.documents) paths.add(`documents/${document.file}`);
const files = await Promise.all([...paths].sort().map(async objectPath => {
  assert.ok(!path.isAbsolute(objectPath) && !objectPath.split('/').includes('..'), 'Invalid object path');
  const source = path.join(root, 'web-app', objectPath.startsWith('documents/') ? objectPath : `public/${objectPath}`);
  const bytes = await readFile(source);
  const type = objectPath.endsWith('.pdf') ? 'application/pdf' : objectPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return {objectPath, source, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), type};
}));

if (process.argv[2] === 'stage') {
  const destination = process.argv[3];
  assert.ok(destination, 'Pass a staging directory outside the repository.');
  for (const file of files) {
    const output = path.join(destination, file.objectPath);
    await mkdir(path.dirname(output), {recursive: true});
    await copyFile(file.source, output);
  }
  console.log(`Staged ${files.length} files (${(files.reduce((sum, file) => sum + file.size, 0) / 1048576).toFixed(1)} MiB).`);
} else if (process.argv[2] === 'verify') {
  const env = Object.fromEntries((await readFile(path.join(root, 'web-app/.env.local'), 'utf8')).split('\n').filter(line => line.includes('=')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  assert.ok(url, 'Set NEXT_PUBLIC_SUPABASE_URL in web-app/.env.local.');
  let index = 0;
  let completed = 0;
  const failures = [];
  await Promise.all(Array.from({length: 6}, async () => {
    while (index < files.length) {
      const file = files[index++];
      try {
        const response = await fetch(catalogMediaURL(file.objectPath, url), {signal: AbortSignal.timeout(60000)});
        assert.equal(response.status, 200);
        assert.ok(response.headers.get('content-type')?.startsWith(file.type));
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(bytes.length, file.size);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
      } catch (error) {
        failures.push({path: file.objectPath, error: error.message});
      }
      completed++;
      if (completed % 50 === 0) console.log(`Compared ${completed}/${files.length} files.`);
    }
  }));
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    const report = {verifiedAt: new Date().toISOString(), projectURL: url, bucket: 'catalog-media', files: files.map(({source, ...file}) => file)};
    await writeFile(path.join(root, 'supabase/media-manifest.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`All ${files.length} public Storage files match the originals byte for byte.`);
  }
} else {
  throw new Error('Use stage <directory> or verify.');
}
