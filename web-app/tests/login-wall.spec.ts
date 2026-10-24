import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('anonymous requests cannot read pages, PDFs, images, or server-rendered data', async ({request}) => {
  for (const path of ['/', '/?q=2605', '/documents', '/shortlist', '/models/door-handles-2605', '/account/password', '/admin', '/manage', '/documents/door-handles-knobs.pdf', '/assets/products/door-handles-2605-individual.png', '/_next/image?url=%2Fassets%2Fproducts%2Ftest.png&w=640&q=75', '/_next/image?url=https%3A%2F%2Fqjaryhukmpodadrcfopb.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fcatalog-media%2Fassets%2Fproducts%2Fdoor-handles-2605-individual.png&w=640&q=75', '/unknown', '/login/nested']) {
    const response = await request.get(path, {maxRedirects:0});
    if (path.startsWith('/_next/image?')) {
      // The disabled managed endpoint can reject requests before the app proxy.
      expect([307, 400, 404], path).toContain(response.status());
      if (response.status() !== 307) continue;
    }
    expect(response.status(), path).toBe(307);
    const destination = new URL(response.headers().location, response.url());
    expect(destination.pathname).toBe('/login');
    if (!path.startsWith('/_next/image?')) expect(destination.searchParams.get('next')).toBe(path);
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  const response = await request.get('/models/door-handles-2605?_rsc=test', {headers:{RSC:'1'}, maxRedirects:0});
  expect(response.status()).toBe(307);
  expect(await response.text()).not.toContain('5755');
});

test('public account pages work without exposing the workspace', async ({page}, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Welcome back'})).toBeVisible();
  await expect(page.getByRole('navigation', {name:'Main navigation'})).toHaveCount(0);
  await expect(page.locator('.product-card')).toHaveCount(0);
  await page.getByRole('link', {name:'Create account', exact:true}).click();
  await expect(page).toHaveURL(/\/signup\?/);
  await expect(page.getByLabel('Name', {exact:true})).toBeVisible();
  await expect(page.getByLabel('Password', {exact:true})).toHaveAttribute('minlength', '12');
  await page.getByRole('link', {name:'Forgot password?'}).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', {name:'Reset your password'})).toBeVisible();
  await expect(page.getByLabel('Password', {exact:true})).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('forgot-password.png'), fullPage:true});
  await page.goto('/auth/callback?code=invalid');
  await expect(page.getByRole('status')).toContainText('expired or is invalid');
  await page.screenshot({path:testInfo.outputPath('login.png'), fullPage:true});
});

test('signup and reset forms submit the expected requests without sending email', async ({page}) => {
  await page.route('**/auth/v1/signup**', async route => {
    const body = route.request().postDataJSON();
    expect(body.data.display_name).toBe('Test customer');
    expect(body.email).toBe('login-wall@example.com');
    expect(body.password.length).toBeGreaterThanOrEqual(12);
    expect(body.data.role).toBeUndefined();
    await route.fulfill({json:{user:{id:'test',identities:[]},session:null}});
  });
  await page.goto('/signup');
  await page.getByLabel('Name', {exact:true}).fill('Test customer');
  await page.getByLabel('Email', {exact:true}).fill('login-wall@example.com');
  await page.getByLabel('Password', {exact:true}).fill('test-password-12345');
  await page.getByRole('button', {name:'Create account', exact:true}).click();
  await expect(page.getByRole('status')).toContainText('confirmation link');
  await page.route('**/auth/v1/recover**', async route => {
    expect(route.request().postDataJSON().email).toBe('login-wall@example.com');
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toContain('/auth/callback?next=/account/password');
    await route.fulfill({json:{}});
  });
  await page.goto('/forgot-password');
  await page.getByLabel('Email', {exact:true}).fill('login-wall@example.com');
  await page.getByRole('button', {name:'Send reset link'}).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
});

test('login restores the requested page and logout closes access', async ({page}) => {
  test.skip(process.env.DALMIA_TEST_LIVE_AUTH !== '1', 'Requires temporary test accounts.');
  const accounts = JSON.parse(await readFile('/private/tmp/dalmia-auth-fixtures.json', 'utf8'));
  const account = accounts.find((entry:{role:string}) => entry.role === 'customer');
  await page.goto('/models/door-handles-2605');
  await page.getByLabel('Email', {exact:true}).fill(account.email);
  await page.getByLabel('Password', {exact:true}).fill(account.password);
  await page.getByRole('button', {name:'Sign in', exact:true}).click();
  await expect(page).toHaveURL(/\/models\/door-handles-2605$/, {timeout:20000});
  await expect(page.locator('h1')).toHaveText('2605');
  const pdf = await page.context().request.get('/documents/door-handles-knobs.pdf', {headers:{Range:'bytes=0-99'}});
  expect(pdf.status()).toBe(206);
  await page.goto('/account');
  await page.getByRole('button', {name:'Sign out', exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/models/door-handles-2605');
  await expect(page.getByRole('heading', {name:'Welcome back'})).toBeVisible();
});

test('external redirect destinations stay inside the website', async ({page}) => {
  await page.goto('/login?next=//example.com');
  await expect(page.getByRole('link', {name:'Create account', exact:true})).toHaveAttribute('href', '/signup?next=%2F');
});
