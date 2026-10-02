import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!email.includes('@'))throw new Error('Pass the confirmed email address of the first super admin.');
const require=createRequire(new URL('../web-app/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const ref='qjaryhukmpodadrcfopb';
const result=JSON.parse(execFileSync('npx',['--yes','supabase@2.118.0','projects','api-keys','--project-ref',ref,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const keys=Array.isArray(result)?result:result.keys;
const key=keys.find(entry=>entry.name==='service_role');
if(!key)throw new Error('Sign in to the Supabase CLI with project administrator access.');
const client=createClient(`https://${ref}.supabase.co`,key.api_key,{auth:{persistSession:false,autoRefreshToken:false}});
let target;
for(let page=1;!target;page++){
  const {data,error}=await client.auth.admin.listUsers({page,perPage:100});if(error)throw new Error(error.message);
  target=data.users.find(user=>user.email?.toLowerCase()===email);
  if(data.users.length<100)break;
}
if(!target)throw new Error('Create this account and confirm its email before assigning super admin access.');
const {error}=await client.rpc('bootstrap_super_admin',{target_user:target.id});
if(error)throw new Error(error.message);
console.log('The confirmed account is now the first super admin.');
