import {cp,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalog=JSON.parse(await readFile(path.join(root,'data/catalog.json'),'utf8'));
await mkdir(path.join(root,'public/documents'),{recursive:true});
for(const doc of catalog.documents)await cp(path.join(root,'documents',doc.file),path.join(root,'public/documents',doc.file));
console.log(`Prepared ${catalog.documents.length} original PDFs for Next.js.`);
