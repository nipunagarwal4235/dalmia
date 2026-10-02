import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';

test('a mobile recovery session opens the password form without leaking tokens in the address',async({page})=>{
  test.skip(process.env.DALMIA_TEST_LIVE_AUTH!=='1','Create temporary auth test accounts first.');
  const accounts=JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json','utf8'));
  const account=accounts.find((entry:{role:string})=>entry.role==='customer');
  const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1).trim()]));
  const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  execFileSync(process.execPath,['../scripts/auth-test-admin.mjs','recovery'],{stdio:['ignore','pipe','pipe']});
  const {hashedToken}=JSON.parse(await readFile('/private/tmp/dalmia-recovery-fixture.json','utf8'));
  const {data,error}=await client.auth.verifyOtp({token_hash:hashedToken,type:'recovery'});
  if(error||!data.session)throw new Error('The recovery test could not create a session.');
  const hash=new URLSearchParams({access_token:data.session.access_token,refresh_token:data.session.refresh_token,type:'recovery'});
  await page.goto(`/auth/mobile#${hash}`);
  await expect(page).toHaveURL(/\/account\/password$/);
  await expect(page.getByRole('heading',{name:'Set a new password'})).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Password',{exact:true}).fill(`${account.password}-reset`);
  await page.getByRole('button',{name:'Save password'}).click();
  try {await expect(page).toHaveURL(/\/account$/);}
  finally {
    await client.auth.signInWithPassword({email:account.email,password:`${account.password}-reset`});
    const reset=await client.auth.updateUser({password:account.password});
    if(reset.error)throw new Error('The recovery test could not restore its temporary password.');
    await client.auth.signOut();
  }
});

test('management pages require sign-in and auth forms remain usable on phone screens',async({page})=>{
  for(const path of ['/admin','/manage','/account']) {await page.goto(path);await expect(page).toHaveURL(/\/login$/);}
  await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByLabel('Name',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('minlength','12');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const role of ['super_admin','admin','manufacturer','retailer','wholesaler','dealer','customer']) {
  test(`${role} signs in and receives only allowed management screens`,async({page})=>{
    test.skip(process.env.DALMIA_TEST_LIVE_AUTH!=='1','Create temporary auth test accounts first.');
    const accounts=JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json','utf8'));
    const account=accounts.find((entry:{role:string})=>entry.role===role);
    await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading',{name:`Test ${role}`,exact:true})).toBeVisible();
    await page.goto('/admin');
    if(['super_admin','admin'].includes(role)) {
      await expect(page.getByRole('heading',{name:'People and access'})).toBeVisible();
      if(role==='admin')await expect(page.getByRole('button',{name:'Save permissions'})).toHaveCount(0);
      else await expect(page.getByRole('button',{name:'Save permissions'})).toHaveCount(6);
    }else await expect(page).toHaveURL(/\/account\?denied=1$/);
    await page.goto('/manage');
    if(['super_admin','admin','manufacturer'].includes(role))await expect(page.getByRole('heading',{name:'Manage products'})).toBeVisible();
    else await expect(page).toHaveURL(/\/account\?denied=1$/);
    await page.goto('/account');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/login$/);
    await page.goto('/admin');await expect(page).toHaveURL(/\/login$/);
  });
}
