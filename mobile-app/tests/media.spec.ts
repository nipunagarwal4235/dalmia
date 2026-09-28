import {test, expect} from '@playwright/test';

test.beforeEach(() => {
  test.skip(process.env.DALMIA_TEST_LIVE_MEDIA !== '1', 'This test needs an export with the live Supabase connection.');
});

test('product pictures load from Supabase Storage', async ({page}) => {
  const responsePending = page.waitForResponse(response => response.url().includes('/storage/v1/object/public/catalog-media/assets/products/'));
  await page.goto('/');
  expect((await responsePending).status()).toBe(200);
  const image = page.locator('[data-testid^="image-"] img').first();
  await expect(image).toHaveAttribute('src', /\/storage\/v1\/object\/public\/catalog-media\//);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
});

test('bundled product pictures load when Storage cannot be reached', async ({page}) => {
  await page.route('**/storage/v1/object/public/catalog-media/**', route => route.abort());
  await page.goto('/');
  const image = page.locator('[data-testid^="image-"] img').first();
  await expect(image).toHaveAttribute('src', /\/assets\//);
  await expect(image).not.toHaveAttribute('src', /supabase\.co/);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
});
