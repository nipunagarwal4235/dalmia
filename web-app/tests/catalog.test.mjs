import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {filterProducts,exportCSV,matchesSize,matchesQuery} from '../lib/catalog.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json')));
const get=(model,category)=>data.products.find(p=>p.model===model&&(!category||p.category===category));
const state={query:'',category:'',size:'',finish:'',status:'',view:'products',sort:'model'};
test('Every source file is preserved and every document page is indexed',()=>{
 assert.equal(data.documents.length,5);assert.equal(data.pages.length,86);
 for(const d of data.documents){assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,'documents',d.file))).digest('hex'),d.sha256);assert.equal(data.pages.filter(p=>p.document===d.id).length,d.pages);}
});
test('Catalog contains all source models and real, resolvable images',()=>{
 assert.equal(data.products.length,149);assert.equal(new Set(data.products.map(p=>p.id)).size,149);
 assert.equal(data.products.filter(p=>p.images.length).length,148);
 assert.equal(data.products.reduce((sum,p)=>sum+p.variants.reduce((n,v)=>n+Object.values(v.prices).filter(x=>x!==null).length,0),0),938);
 for(const p of data.products){for(const i of p.images){assert.ok(fs.existsSync(path.join(root,'public',i.src)));assert.ok(fs.existsSync(path.join(root,'public',i.detail)));}for(const s of p.sources){const d=data.documents.find(d=>d.id===s.document);assert.ok(d);assert.ok(s.page>=1&&s.page<=d.pages);}}
});
test('Model search handles spaces and hyphens without merging separate products',()=>{
 assert.equal(filterProducts(data.products,{...state,query:'DH 1501'})[0].model,'DH-1501');
 const r=filterProducts(data.products,{...state,query:'1501'});
 assert.equal(r[0].model,'1501');assert.ok(r.some(p=>p.model==='DH-1501'));
 assert.equal(filterProducts(data.products,{...state,query:'not-a-product-xyz'}).length,0);
 assert.deepEqual(filterProducts(data.products,{...state,query:'2605'}).map(p=>p.model),['2605']);
});
test('Source anomalies remain intact, blank prices remain null',()=>{
 assert.equal(get('2605').variants[0].prices['10 in'],5755);
 assert.equal(get('1510','Sofa legs').variants[0].prices['6 in'],110);
 assert.ok(get('2605').notes.some(n=>n.includes('5755')));
 assert.equal(get('1711').variants[0].prices['8 in'],null);
 assert.deepEqual(get('1272').variants[0].prices,{'2 in':null,'4 in':340,'6 in':510,'8 in':680});
});
test('Merged cells and rows that continue on another page retain their meaning',()=>{
 assert.deepEqual(get('1254').variants.map(v=>[v.finish,v.prices]),[['CP',{'Not specified':270}],['BLACK',{'Not specified':330}]]);
 assert.equal(get('1249').variants.length,6);
 assert.equal(get('1263').variants[0].finish,'BLACK-MATT, BLACK');
 assert.equal(get('1253').variants.at(-1).finish,'Not specified');
});
test('Catalog-only models never receive a guessed price or picture',()=>{
 assert.deepEqual(data.products.filter(p=>!p.variants.length).map(p=>p.model),['1203','1231','1244']);
 assert.equal(get('1202').images.length,0);assert.equal(get('1203').variants.length,0);
});
test('Profile rates and box quantities are distinct from fixed prices',()=>{
 assert.equal(get('DH-1001').variants[0].unit,'Per inch');assert.equal(get('DH-1001').variants[0].prices['4–30 in'],30);
 assert.equal(get('DH-1001').variants[0].box,30);
 assert.ok(matchesSize(get('DH-1001'),'24 in'));assert.ok(!matchesSize(get('DH-1001'),'32 in'));
 assert.equal(get('DH-1506').variants[0].box,12);
 assert.equal(get('Folding Table Bracket (Heavy)').variants[0].boxUnit,'sets');
});
test('Filters combine and saved products remain separate from the catalog',()=>{
 const r=filterProducts(data.products,{...state,category:'Sofa legs',size:'4 in',finish:'Black'});assert.ok(r.length>10);assert.ok(r.every(p=>p.category==='Sofa legs'));
 assert.equal(filterProducts(data.products,{...state,status:'unpriced'}).length,3);
 assert.equal(filterProducts(data.products,{...state,view:'saved'},new Set([get('1701').id])).length,1);
 const sort=filterProducts(data.products,{...state,sort:'price-asc'});assert.equal(sort.at(-1).minPrice,null);
});
test('CSV exports every variant and blank size cell with provenance',()=>{
 const csv=exportCSV([get('1272'),get('2605')],data.documents);
 assert.equal(csv.split('\r\n').length,20);assert.ok(csv.includes('"5755"'));assert.ok(csv.includes('"SOFA LEG (1).pdf","6"'));assert.ok(csv.includes('"2 in",""'));
});

test('Document model search does not join adjacent price cells',()=>{assert.equal(matchesQuery('170 195 220','1701'),false);assert.equal(matchesQuery('Model 1701','1701'),true);assert.equal(matchesQuery('DH-1501','DH1501'),true);});

test('Every pictured model has a separate image, with no shared group photo',()=>{
 const pictured=data.products.filter(p=>p.images.length);
 const hashes=pictured.map(p=>createHash('sha256').update(fs.readFileSync(path.join(root,'public',p.images[0].src))).digest('hex'));
 assert.equal(new Set(hashes).size,148);
 for(const p of pictured){assert.equal(p.images[0].shared,false);assert.ok(p.images[0].width>0);assert.ok(p.images[0].height>0);}
 for(let model=2601;model<=2611;model++){const p=get(String(model));assert.ok(p.images[0].src.endsWith('-individual.png'));assert.equal(p.images[0].extraction.sourcePage,23);assert.ok(p.images[0].extraction.polygon.length>=3);}
});
