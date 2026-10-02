// Creates temporary accounts without sending email. The file stays outside Git.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../web-app/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const ref='qjaryhukmpodadrcfopb';
const fixture='/private/tmp/dalmia-auth-fixtures.json';
const raw=JSON.parse(execFileSync('npx',['--yes','supabase@2.118.0','projects','api-keys','--project-ref',ref,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const keys=Array.isArray(raw)?raw:raw.keys;
const secret=keys.find(key=>key.name==='service_role')||keys.find(key=>key.type==='secret');
assert.ok(secret,'An administrator API key is required for test accounts.');
const client=createClient(`https://${ref}.supabase.co`,secret.api_key||secret.key,{auth:{persistSession:false,autoRefreshToken:false}});
const accounts=[];
if(process.argv[2]==='create') {
  try{await readFile(fixture);throw new Error('Delete existing test accounts before creating more.');}catch(error){if(error.code!=='ENOENT')throw error;}
  const stamp=Date.now();
  try {
    for(const role of ['super_admin','admin','manufacturer','retailer','wholesaler','dealer','customer']) {
      const email=`dalmia-auth-test-${stamp}-${role}@example.com`;
      const password=randomBytes(30).toString('base64url');
      const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:`Test ${role}`,role:'super_admin'}});
      if(error)throw new Error(`Cannot create ${role} test account: ${error.message}`);
      const id=data.user.id;accounts.push({id,role,email,password});
      await writeFile(fixture,JSON.stringify(accounts),{mode:0o600});
      const initial=await client.from('user_roles').select('role').eq('user_id',id);
      assert.deepEqual(initial.data,[{role:'customer'}]);
      const removed=await client.from('user_roles').delete().eq('user_id',id);if(removed.error)throw removed.error;
      const added=await client.from('user_roles').insert({user_id:id,role});if(added.error)throw added.error;
    }
    console.log(`Created ${accounts.length} temporary accounts. Signup metadata cannot grant staff access.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
} else if(process.argv[2]==='delete') {
  const saved=JSON.parse(await readFile(fixture,'utf8'));
  for(const account of saved) {
    const {data,error}=await client.auth.admin.getUserById(account.id);if(error)throw error;
    assert.equal(data.user.email,account.email);assert.match(account.email,/^dalmia-auth-test-\d+-[a-z_]+@example\.com$/);
    const removed=await client.auth.admin.deleteUser(account.id);if(removed.error)throw removed.error;
  }
  await unlink(fixture);console.log(`Removed ${saved.length} temporary accounts.`);
} else throw new Error('Use create or delete.');
