import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('saved products sync between website and mobile and retain offline removals',async({page,browser})=>{
 test.skip(process.env.DALMIA_TEST_LIVE_SYNC!=='1','Requires mobile preview and temporary accounts.');
 const accounts=JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json','utf8'));const account=accounts.find((item:{role:string})=>item.role==='retailer');
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/account$/);
 await page.goto('/?q=1701');const save=page.getByRole('button',{name:/1701 Door handles.*shortlist/});await expect(save).toHaveAttribute('aria-pressed','false');await save.click();await expect(save).toHaveAttribute('aria-pressed','true');
 const context=await browser.newContext({viewport:{width:390,height:844}});const mobile=await context.newPage();
 try{
  await mobile.goto('http://127.0.0.1:4182');await mobile.getByRole('tab',{name:'Account',exact:true}).click();await mobile.getByLabel('Email',{exact:true}).fill(account.email);await mobile.getByLabel('Password',{exact:true}).fill(account.password);await mobile.getByRole('button',{name:'Sign in',exact:true}).click();await expect(mobile.getByText(account.email,{exact:true})).toBeVisible();
  await mobile.getByRole('tab',{name:/Saved products/}).click();await expect(mobile.getByRole('tab',{name:'Saved products, 1 liked'})).toBeVisible({timeout:25000});
  await context.setOffline(true);await mobile.getByRole('button',{name:'Unlike model 1701',exact:true}).click();await expect(mobile.getByRole('tab',{name:'Saved products, 0 liked'})).toBeVisible();await context.setOffline(false);
  await expect(page.locator('#saved-count')).toHaveText('0',{timeout:40000});
  await mobile.getByRole('tab',{name:'Account',exact:true}).click();await mobile.getByRole('button',{name:'Sign out',exact:true}).click();await expect(mobile.getByText('Welcome back',{exact:true})).toBeVisible();
 }finally{await context.close();}
});
