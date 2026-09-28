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

test('unavailable Storage does not trigger local image requests', async ({page}) => {
  const localImages: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/assets/')) localImages.push(request.url());
  });
  const failed = page.waitForEvent('requestfailed', request => request.url().includes('/catalog-media/assets/products/'));
  await page.route('**/storage/v1/object/public/catalog-media/**', route => route.abort());
  await page.goto('/');
  await failed;
  const picture = page.locator('[data-testid^="image-"]').first();
  await expect(picture).toBeVisible();
  await expect(picture.locator('img')).toHaveCount(0);
  expect(localImages).toEqual([]);
});
