// Temporary test accounts only. Credentials stay in memory.
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../web-app/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const raw=JSON.parse(execFileSync('npx',['--yes','supabase@2.118.0','projects','api-keys','--project-ref','qjaryhukmpodadrcfopb','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const keys=Array.isArray(raw)?raw:raw.keys;const key=keys.find(k=>k.name==='service_role')||keys.find(k=>k.type==='secret');
const client=createClient('https://qjaryhukmpodadrcfopb.supabase.co',key.api_key||key.key,{auth:{persistSession:false,autoRefreshToken:false}});
const accounts=JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json','utf8'));
for(const account of accounts){
 assert.match(account.email,/^dalmia-auth-test-\d+-[a-z_]+@example\.com$/);
 const {data,error}=await client.auth.admin.getUserById(account.id);if(error)throw error;assert.equal(data.user.email,account.email);
 const result=await client.auth.admin.updateUserById(account.id,{password:account.password});if(result.error)throw result.error;
}
console.log('Restored temporary account passwords.');
if(process.argv[2]==='recovery'){
 const account=accounts.find(a=>a.role==='customer');
 const {data,error}=await client.auth.admin.generateLink({type:'recovery',email:account.email,options:{redirectTo:'https://dalmia-blush.vercel.app/auth/mobile'}});if(error)throw error;
 await writeFile('/private/tmp/dalmia-recovery-fixture.json',JSON.stringify({hashedToken:data.properties.hashed_token}),{mode:0o600});
 console.log('Prepared one recovery link without sending email.');
}
