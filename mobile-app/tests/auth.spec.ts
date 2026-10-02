/// <reference types="node" />
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('account tab offers sign-in without exposing management controls',async({page})=>{
  await page.goto('/');await page.getByRole('tab',{name:'Account',exact:true}).click();
  await expect(page.getByText('Welcome back',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
  await expect(page.getByText('Open management on the website',{exact:true})).toHaveCount(0);
});
test('mobile sign-in survives reload and sign-out clears account access',async({page})=>{
  test.skip(process.env.DALMIA_TEST_LIVE_AUTH!=='1','Create temporary auth test accounts first.');
  const accounts=JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json','utf8'));
  const account=accounts.find((entry:{role:string})=>entry.role==='customer');
  await page.goto('/');await page.getByRole('tab',{name:'Account',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByText(account.email,{exact:true})).toBeVisible();
  await expect(page.getByText('Customer',{exact:true})).toBeVisible();
  await page.reload();await page.getByRole('tab',{name:'Account',exact:true}).click();await expect(page.getByText(account.email,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByText('Welcome back',{exact:true})).toBeVisible();
  await page.reload();await page.getByRole('tab',{name:'Account',exact:true}).click();await expect(page.getByText('Welcome back',{exact:true})).toBeVisible();
});
