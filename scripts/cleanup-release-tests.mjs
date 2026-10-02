import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readdir,readFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../web-app/package.json',import.meta.url));const {createClient}=require('@supabase/supabase-js');
const raw=JSON.parse(execFileSync('npx',['--yes','supabase@2.118.0','projects','api-keys','--project-ref','qjaryhukmpodadrcfopb','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const keys=Array.isArray(raw)?raw:raw.keys;const key=keys.find(k=>k.name==='service_role')||keys.find(k=>k.type==='secret');
const client=createClient('https://qjaryhukmpodadrcfopb.supabase.co',key.api_key||key.key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:rows,error}=await client.from('catalog_products').select('id,model').like('model','Release test %');if(error)throw error;
for(const row of rows){assert.match(row.model,/^Release test \d+$/);assert.match(row.id,/^[a-f0-9-]{36}$/);const result=await client.from('catalog_products').delete().eq('id',row.id);if(result.error)throw result.error;}
let count=0;
for(const name of await readdir('/private/tmp'))if(/^dalmia-test-media-[a-f0-9-]+\.json$/.test(name)){
 const file=`/private/tmp/${name}`;const {id,path}=JSON.parse(await readFile(file,'utf8'));assert.match(id,/^[a-f0-9-]{36}$/);assert.ok(path.startsWith(`assets/products/${id}/`));assert.match(path,/\/[a-f0-9-]{36}\.png$/);
 const result=await client.storage.from('catalog-media').remove([path]);if(result.error)throw result.error;await unlink(file);count++;
}
console.log(`Removed ${rows.length} temporary products and ${count} test images.`);
