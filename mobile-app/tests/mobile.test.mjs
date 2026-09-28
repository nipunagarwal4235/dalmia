import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {findProducts,swipeAction,nextIndex,restoreSaved} from '../src/lib/catalog.mjs';
import {calculatedPrices} from '../src/lib/pricing.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const {products,documents}=JSON.parse(fs.readFileSync(path.join(root,'src/data/catalog.json')));

test('All 149 products retain their distinct Storage image paths',()=>{
 assert.equal(products.length,149);assert.equal(documents.length,5);
 const pictured=products.filter(p=>p.images.length);assert.equal(pictured.length,148);
 assert.equal(new Set(pictured.map(p=>p.images[0].src)).size,148);
 assert.equal(products.find(p=>p.model==='1202').images.length,0);
 assert.equal(products.reduce((count,p)=>count+p.variants.reduce((n,v)=>n+Object.values(v.prices).filter(price=>price!==null).length,0),0),938);
});
test('Right means save and left means next; vertical and small movements do not act',()=>{
 assert.equal(swipeAction(130,12),'save');assert.equal(swipeAction(-130,12),'next');
 assert.equal(swipeAction(10,160),null);assert.equal(swipeAction(60,90),null);assert.equal(swipeAction(25,3),null);
 assert.equal(swipeAction(50,4,1.1),'save');assert.equal(swipeAction(-50,4,-1.1),'next');
 assert.equal(swipeAction(4,2,2),null);
});
test('The feed advances safely and wraps at the last product',()=>{
 assert.equal(nextIndex(0,149),1);assert.equal(nextIndex(148,149),0);assert.equal(nextIndex(0,1),0);assert.equal(nextIndex(0,0),0);
});
test('Saved products survive serialization without duplicates or unknown models',()=>{
 const id=products[0].id;assert.deepEqual([...restoreSaved(JSON.stringify([id,id,'missing',null]),products)],[id]);
 assert.deepEqual([...restoreSaved('{bad-json',products)],[]);assert.deepEqual([...restoreSaved('{}',products)],[]);
});
test('Model search, categories, and saved filters combine',()=>{
 assert.equal(findProducts(products,'DH1501')[0].model,'DH-1501');assert.equal(findProducts(products,'DH 1501')[0].model,'DH-1501');
 assert.equal(findProducts(products,'2605').length,1);assert.equal(findProducts(products,'2605')[0].model,'2605');
 assert.equal(findProducts(products,'','Door handles').length,46);
 const match=products.find(p=>p.model==='2601');assert.equal(findProducts(products,'2601','Door handles',new Set([match.id])).length,1);
 assert.equal(findProducts(products,'','',new Set()).length,0);
});
test('Price calculations keep source units, missing values, and rounding',()=>{
 assert.deepEqual(calculatedPrices(1000),[350,250,413,295,381.5,272.5]);
 assert.deepEqual(calculatedPrices(30),[10.5,7.5,12.39,8.85,11.45,8.18]);
 assert.deepEqual(calculatedPrices(null),Array(6).fill(null));
 assert.equal(products.find(p=>p.model==='DH-1001').variants[0].unit,'Per inch');
 assert.equal(products.find(p=>p.model==='1203').minPrice,null);
});
