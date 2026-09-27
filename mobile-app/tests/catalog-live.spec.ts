import {test, expect} from '@playwright/test';
import builds from '../eas.json';

test('the mobile app downloads and caches the hosted Supabase catalog', async ({page}) => {
  test.skip(process.env.DALMIA_TEST_LIVE_DATABASE !== '1', 'This test needs the live Supabase project.');
  const url = builds.build.base.env.EXPO_PUBLIC_SUPABASE_URL;
  const pending = page.waitForResponse(response => response.url() === `${url}/rest/v1/rpc/get_catalog`);
  await page.goto('/');
  const response = await pending;
  expect(response.status()).toBe(200);
  const catalog = await response.json();
  expect(catalog.products.length).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(key => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value).products.length : 0;
  }, `dalmia-catalog-v1:${url}`)).toBe(catalog.products.length);
  await expect(page.getByText(`${catalog.products.length} products`, {exact: true})).toBeVisible();
});
