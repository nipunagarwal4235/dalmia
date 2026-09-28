import {test, expect} from '@playwright/test';

test.beforeEach(() => {
  test.skip(process.env.DALMIA_TEST_LIVE_MEDIA !== '1', 'This test needs the live Supabase media bucket.');
});

test('failed Storage images do not switch to local files', async ({page}) => {
  const localImages: string[] = [];
  page.on('request', request => {
    if (/^\/assets\/(products|pages)\//.test(new URL(request.url()).pathname)) localImages.push(request.url());
  });
  await page.route('**/_next/image?**', route => route.abort());
  await page.goto('/models/door-handles-2605');
  const image = page.locator('.detail-picture img');
  await expect(image).toHaveAttribute('src', /catalog-media/);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete)).toBe(true);
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(0);
  expect(localImages).toEqual([]);
});

test('catalog images and PDF links use Supabase Storage', async ({page, request}) => {
  await page.goto('/models/door-handles-2605');
  const picture = page.locator('.detail-picture');
  const url = await picture.getAttribute('href');
  expect(url).toContain('/storage/v1/object/public/catalog-media/assets/products/');
  await expect.poll(() => picture.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.goto('/documents');
  const cover = page.locator('.document-card img').first();
  await expect(cover).toHaveAttribute('src', /catalog-media/);
  await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const pdfURL = await page.locator('.document-card a').first().getAttribute('href');
  expect(pdfURL).toContain('/storage/v1/object/public/catalog-media/documents/');
  const pdf = await request.get(pdfURL!, {headers: {Range: 'bytes=0-99'}});
  expect(pdf.status()).toBe(206);
  expect((await pdf.body()).length).toBe(100);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  const downloadURL = await page.locator('.document-card a[download]').first().getAttribute('href');
  const download = await request.get(downloadURL!, {headers: {Range: 'bytes=0-99'}});
  expect(download.headers()['content-disposition']).toContain('attachment');
});
