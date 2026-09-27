import {test, expect} from '@playwright/test';
import catalog from '../src/data/catalog.json';

test('database products and likes survive a reload when the catalog service is offline', async ({page}) => {
  test.skip(!process.env.EXPO_PUBLIC_SUPABASE_URL, 'Export with a Supabase URL to test database synchronization.');
  const product = {...catalog.products[0], id: 'database-only-model', model: 'REMOTE-9000', images: [], searchText: 'REMOTE-9000 Brackets'};
  const remote = {...catalog, products: [product]};
  let offline = false;
  await page.route('**/rest/v1/rpc/get_catalog', async route => {
    if (offline) await route.abort();
    else await route.fulfill({json: remote});
  });
  await page.goto('/');
  await expect(page.getByRole('button', {name: 'Like model REMOTE-9000', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Like model REMOTE-9000', exact: true}).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('dalmia-mobile-likes-v1'))).toContain('database-only-model');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('dalmia-catalog-v1:')))).toBe(true);
  offline = true;
  await page.reload();
  await page.getByRole('tab', {name: 'Saved products, 1 liked'}).click();
  await expect(page.getByRole('button', {name: 'Unlike model REMOTE-9000', exact: true})).toBeVisible();
});
