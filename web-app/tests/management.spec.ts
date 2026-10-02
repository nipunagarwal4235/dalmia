import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
test('staff can create, price, upload and delete a product through the dashboard',async({page})=>{
 test.skip(process.env.DALMIA_TEST_LIVE_AUTH!=='1','Requires temporary role accounts.');
 const accounts=JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json','utf8'));
 const account=accounts.find((item:{role:string})=>item.role==='admin');
 const model=`Release test ${Date.now()}`;
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/account$/);
 await page.goto('/manage');await page.getByRole('button',{name:'Add product',exact:true}).click();
 await page.getByLabel('Model',{exact:true}).fill(model);await page.getByLabel('Specifications, one per line').fill('Release test specification');
 await page.getByRole('button',{name:'Add finish',exact:true}).click();await page.getByLabel('Finish',{exact:true}).fill('Test gold');
 await page.getByLabel('Size',{exact:true}).fill('8 in');await page.getByLabel('Listed price 1-1',{exact:true}).fill('1000');
 await page.getByRole('button',{name:'Create product',exact:true}).click();await expect(page.getByRole('button',{name:'Save product',exact:true})).toBeVisible();
 const id=await page.getByLabel('Product',{exact:true}).inputValue();
 const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1).trim()]));
 const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 await client.auth.signInWithPassword({email:account.email,password:account.password});
 try {
  await page.getByLabel('Upload product image').setInputFiles('public/assets/products/door-handles-2601-individual.png');
  await expect(page.getByRole('status')).toContainText('Image uploaded.');await page.getByRole('button',{name:'Save product',exact:true}).click();
  await expect.poll(async()=>{const {data}=await client.from('catalog_products').select('data').eq('id',id).single();return data?.data.images.length;}).toBe(1);
  const {data:record}=await client.from('catalog_products').select('data').eq('id',id).single();
  await writeFile(`/private/tmp/dalmia-test-media-${id}.json`,JSON.stringify({id,path:record!.data.images[0].src}),{mode:0o600});
  await page.goto(`/models/${id}`);await expect(page.locator('h1')).toHaveText(model);await expect(page.locator('.detail-price')).toContainText('1,000');await expect(page.locator('.source-price-table')).toContainText('Updated in dashboard');
  await page.waitForFunction(()=>{const image=document.querySelector('.detail-picture img') as HTMLImageElement;return image?.complete&&image.naturalWidth>0;});
  await page.goto('/manage');await page.getByLabel('Product',{exact:true}).selectOption(id);await page.getByLabel('Listed price 1-1',{exact:true}).fill('1200');await page.getByRole('button',{name:'Save product',exact:true}).click();
  await expect.poll(async()=>{const {data}=await client.from('catalog_products').select('data').eq('id',id).single();return data?.data.minPrice;}).toBe(1200);
  await page.getByRole('button',{name:'Delete product',exact:true}).click();await page.getByLabel(`Type ${model} to delete`).fill(model);await page.getByRole('button',{name:'Permanently delete product'}).click();
  await expect.poll(async()=>{const {data}=await client.from('catalog_products').select('id').eq('id',id);return data?.length;}).toBe(0);
 } finally {await client.from('catalog_products').delete().eq('id',id);await client.auth.signOut();}
});
