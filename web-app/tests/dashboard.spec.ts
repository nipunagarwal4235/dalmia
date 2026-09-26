import { test,expect } from '@playwright/test';
test('search, unique model routes, source prices, and browser navigation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#result-count')).toContainText('149 products');
 await page.getByRole('searchbox').fill('DH 1501');await expect(page.locator('.product-card')).toHaveCount(1);await expect(page.locator('.card-title')).toHaveText('DH-1501');
 await page.getByRole('searchbox').fill('1501');await expect(page.locator('.product-card')).toHaveCount(2);
 await page.getByRole('searchbox').fill('2605');await expect(page.locator('.product-card')).toHaveCount(1);
 const image=page.locator('.product-photo img');await expect(image).toHaveAttribute('src',/2605-individual/);
 await page.getByRole('link',{name:'View Door handles 2605',exact:true}).click();await expect(page).toHaveURL(/\/models\/door-handles-2605$/);await expect(page.locator('h1')).toHaveText('2605');await expect(page.locator('.source-price-table')).toContainText('5,755');await expect(page.locator('.notice')).toContainText('printed as 5755');
 await page.reload();await expect(page.locator('h1')).toHaveText('2605');await expect(page.locator('.detail-picture')).toHaveAttribute('href',/2605-individual\.png$/);
 await page.goBack();await expect(page.getByRole('searchbox')).toHaveValue('2605');
 await page.getByRole('searchbox').fill('unknown-model');await expect(page.locator('.empty h2')).toHaveText('No matching products');await page.getByRole('button',{name:'Clear search and filters'}).click();await expect(page.locator('#result-count')).toContainText('149 products');
 expect(errors).toEqual([]);
});
test('filters, per-inch ranges, layouts, and CSV export',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Door handles 46',exact:true}).click();await expect(page.locator('#result-count')).toContainText('46 products');
 await page.locator('#size').selectOption('8 in');await expect(page.locator('#result-count')).not.toContainText('46 products');
 await page.getByRole('button',{name:'List view',exact:true}).click();await expect(page.locator('#results')).toHaveClass(/list/);
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.locator('#size').selectOption('30 in');await expect(page.locator('.product-card')).toHaveCount(1);await expect(page.locator('.card-title')).toHaveText('DH-1001');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await page.getByRole('searchbox').fill('1272');
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export results'}).click();const download=await downloading;expect(download.suggestedFilename()).toBe('dalmia-products.csv');const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);expect(Buffer.concat(chunks).toString()).toContain('"8 in","680"');
});
test('shortlist survives navigation and reload',async({page})=>{
 await page.goto('/?q=1701');await page.getByRole('button',{name:'Save 1701 Door handles to shortlist',exact:true}).click();await expect(page.locator('#saved-count')).toHaveText('1');
 await page.getByRole('link',{name:'View Door handles 1701',exact:true}).click();await expect(page.getByRole('button',{name:'Saved to shortlist',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'Saved to shortlist',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Shortlist',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(1);await page.getByRole('button',{name:'Remove 1701 Door handles from shortlist'}).click();await expect(page.locator('.empty h2')).toHaveText('Keep your favorites close.');
});
test('documents, PDF range requests, missing records and old links',async({page,request})=>{
 await page.goto('/documents');await expect(page.locator('.document-card')).toHaveCount(5);await page.getByRole('searchbox').fill('1701');await expect(page.locator('.document-result')).toHaveCount(2);
 const pdf=await request.get('/documents/door-handles-knobs.pdf',{headers:{Range:'bytes=0-99'}});expect(pdf.status()).toBe(206);expect((await pdf.body()).length).toBe(100);expect(pdf.headers()['content-type']).toContain('application/pdf');
 await page.goto('/models/sofa-legs-1202');await expect(page.locator('.missing-detail')).toContainText('No picture of model 1202');
 await page.goto('/models/sofa-legs-1203');await expect(page.locator('.detail-price')).toContainText('Price not listed');
 await page.goto('/?q=1701&product=door-handles-1701');await expect(page).toHaveURL(/\/models\/door-handles-1701$/);
 const missing=await request.get('/models/nonexistent-model');expect(missing.status()).toBe(404);
 await page.goto('/?q=Folding');await page.getByRole('link',{name:'View Brackets Folding Table Bracket (Heavy)',exact:true}).click();await expect(page).toHaveURL(/\/models\/brackets-folding-table-bracket-heavy$/);await expect(page.locator('h1')).toHaveText('Folding Table Bracket (Heavy)');
});
test('separate image gallery and responsive page layout',async({page},testInfo)=>{
 await page.goto('/?q=260');await expect(page.locator('.product-card')).toHaveCount(9);
 await page.locator('.product-photo img').first().waitFor();
 const sources=await page.locator('.product-photo img').evaluateAll(images=>images.map(image=>(image as HTMLImageElement).getAttribute('src')));expect(new Set(sources).size).toBe(9);expect(sources.every(src=>src?.includes('-individual'))).toBe(true);
 await page.waitForFunction(()=>[...document.querySelectorAll('.product-photo img')].slice(0,4).every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('individual-images.png'),fullPage:true});
 await page.getByRole('link',{name:'View Door handles 2601',exact:true}).click();await expect(page.locator('h1')).toHaveText('2601');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.detail-picture img')).toBeVisible();await page.screenshot({path:testInfo.outputPath('model-page.png'),fullPage:true});
});

test('calculated fields show discount then additions for every price and CSV export',async({page},testInfo)=>{
 await page.goto('/?q=DH1001');
 const summary=page.locator('.calculated-summary');
 await expect(summary.locator('dt')).toHaveText(['65% off','75% off','65% off + 18%','75% off + 18%','65% off + 9%','75% off + 9%']);
 await expect(summary.locator('dd')).toHaveText(['10.50','7.50','12.39','8.85','11.45','8.18']);
 await expect(summary).toContainText('/ inch');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('calculated-card.png'),fullPage:true});
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export results'}).click();
 const download=await downloading;const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);
 const csv=Buffer.concat(chunks).toString();expect(csv).toContain('"65% off","75% off","65% off + 18%","75% off + 18%","65% off + 9%","75% off + 9%"');expect(csv).toContain('"10.50","7.50","12.39","8.85","11.45","8.18"');
 await page.getByRole('link',{name:'View Profile handles DH-1001',exact:true}).click();
 const row=page.locator('.calculated-table tbody tr').first();
 await expect(row.locator('td').nth(2)).toHaveText('Per inch');
 await expect(row.locator('td.price-cell')).toHaveText(['30.00','10.50','7.50','12.39','8.85','11.45','8.18']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('calculated-details.png'),fullPage:true});
 await page.goto('/models/sofa-legs-1272');
 await expect(page.locator('.calculated-table tbody tr').first().locator('td.price-cell')).toHaveText(Array(7).fill('—'));
 await page.goto('/models/sofa-legs-1203');await expect(page.locator('.calculated-section')).toContainText('Calculated prices are unavailable');
});
