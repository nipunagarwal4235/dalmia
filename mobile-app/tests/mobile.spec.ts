import {test,expect,type Page} from '@playwright/test';
async function drag(page:Page,from:{x:number;y:number},to:{x:number;y:number}){
 const session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:0}]});
 for(let step=1;step<=12;step++){
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*step/12,y:from.y+(to.y-from.y)*step/12,id:0}]});
  await page.waitForTimeout(18);
 }
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
}
async function activeModel(page:Page,model:string){
 const button=page.getByRole('button',{name:`Next product after ${model}`,exact:true});
 await expect(button).toBeInViewport();
}

test('right swipe saves, left swipe only advances, and likes survive reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await activeModel(page,'1701');
 await drag(page,{x:85,y:290},{x:310,y:294});await activeModel(page,'1702');
 await expect(page.getByRole('tab',{name:'Saved products, 1 liked'})).toBeVisible();
 await drag(page,{x:310,y:290},{x:75,y:294});await activeModel(page,'1703');
 await expect(page.getByRole('tab',{name:'Saved products, 1 liked'})).toBeVisible();
 await page.getByRole('tab',{name:'Saved products, 1 liked'}).click();await activeModel(page,'1701');
 await page.reload();await page.getByRole('tab',{name:'Saved products, 1 liked'}).click();await activeModel(page,'1701');
 await page.getByRole('button',{name:'Unlike model 1701',exact:true}).click();await expect(page.getByText('Keep what you love.')).toBeVisible();
 expect(errors).toEqual([]);
});

test('vertical feed, search, source price details and responsive layout',async({page},testInfo)=>{
 await page.goto('/');await activeModel(page,'1701');
 await page.waitForTimeout(250);
 await page.screenshot({path:testInfo.outputPath('discovery.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await drag(page,{x:180,y:460},{x:184,y:185});await activeModel(page,'1702');
 await expect(page.getByRole('tab',{name:'Saved products, 0 liked'})).toBeVisible();
 await page.getByRole('button',{name:'Search models and filter categories'}).click();
 await page.getByRole('textbox',{name:'Search model number or finish'}).fill('DH1001');
 await page.getByRole('textbox',{name:'Search model number or finish'}).press('Enter');await activeModel(page,'DH-1001');
 await page.getByRole('button',{name:'View details for DH-1001'}).click();
 await expect(page.getByText('65% off + 18%',{exact:true})).toBeVisible();await expect(page.getByText('12.39',{exact:true})).toBeVisible();
 await expect(page.getByText('75% off + 9%',{exact:true})).toBeVisible();
 await expect.poll(async()=> (await page.getByRole('button',{name:'Close product details'}).boundingBox())?.y).toBeLessThan(70);
 await page.getByText('Calculated prices',{exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath('product-details.png')});
 await page.getByRole('button',{name:'Close product details'}).click();
 await page.getByRole('button',{name:'Reset all filters'}).click();
 await page.getByRole('button',{name:'Search models and filter categories'}).click();await page.getByRole('textbox',{name:'Search model number or finish'}).fill('no-such-product');
 await expect(page.getByText('No matching products',{exact:true})).toBeVisible();
});
