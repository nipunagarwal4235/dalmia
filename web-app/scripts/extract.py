"""Build the catalog from the supplied PDFs and local macOS Vision results.
Usage: python scripts/extract.py [path/to/documents]
Requires PyMuPDF. Scanned pages use data/ocr/*.json from scripts/ocr.swift.
"""
import hashlib, json, pathlib, re, sys
import pymupdf as fitz
ROOT = pathlib.Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
DOCS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'documents'
FILES = [('handles','door-handles-knobs.pdf','Door handles & knobs','Catalog'),('sofa','sofa-legs.pdf','Sofa legs','Catalog'),('handle-prices','Door handle price list.pdf','Door handles & knobs prices','Price list'),('sofa-prices','SOFA LEG (1).pdf','Sofa leg prices','Price list'),('profile','profile handles.pdf','Profile & concealed handles','Price list')]
manifest = json.loads((ROOT/'data/source-manifest.json').read_text())
for filename, expected in manifest.items():
    actual = hashlib.sha256((DOCS/filename).read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError(f'{filename} changed. Review the extraction rules and profile transcriptions before updating the manifest.')
for d in ['assets/products','assets/pages']: (PUBLIC/d).mkdir(parents=True,exist_ok=True)
products = {}
documents = []
pages = []
def product(model,category):
    key = category.lower().replace(' ','-')+'-'+model.lower()
    if key not in products:
        products[key] = dict(id=key, model=model, category=category, variants=[], sources=[], images=[], notes=[], catalogText='', specs=[])
    return products[key]
def source(p,slug,page,kind):
    s=dict(document=slug,page=page,kind=kind)
    if s not in p['sources']:p['sources'].append(s)
    return s
def lines(page):
    out=[]
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines',[]):
            t=''.join(s['text'] for s in l['spans']).strip()
            if t:out.append(dict(text=t,x=(l['bbox'][0]+l['bbox'][2])/2,y=l['bbox'][1],bbox=l['bbox']))
    return sorted(out,key=lambda a:(a['y'],a['x']))
def rows(page):
    out=[]
    for l in lines(page):
        if not out or abs(l['y']-out[-1][0]['y'])>1.5:out.append([])
        out[-1].append(l)
    return [sorted(r,key=lambda a:a['x']) for r in out]
def crop(page,box,name,width=850):
    rect=fitz.Rect(box)
    path='assets/products/'+name+'.jpg'
    page.get_pixmap(matrix=fitz.Matrix(width/rect.width,width/rect.width),clip=rect).save(PUBLIC/path,jpg_quality=86)
    return path
def image_region(page,region,name):
    return crop(page,[region[0]*page.rect.width,region[1]*page.rect.height,region[2]*page.rect.width,region[3]*page.rect.height],name)
for slug,file,title,kind in FILES:
    d=fitz.open(DOCS/file)
    documents.append(dict(id=slug,file=file,title=title,kind=kind,pages=len(d),bytes=(DOCS/file).stat().st_size,sha256=hashlib.sha256((DOCS/file).read_bytes()).hexdigest()))
    for i,page in enumerate(d,1):
        ocrfile=ROOT/f'data/ocr/{slug}-{i:02}.json'
        ocr=json.loads(ocrfile.read_text()) if ocrfile.exists() else []
        txt=page.get_text().strip()
        if not txt:
            if not ocr:raise ValueError(f'Missing OCR: {ocrfile}')
            txt='\n'.join(r['text'] for r in sorted(ocr,key=lambda r:(round(r['box'][1]*70),r['box'][0])))
        pages.append(dict(document=slug,page=i,text=txt,image=f'assets/pages/{slug}-{i:02}.jpg',machineRead=slug in ['handles','sofa']))
        imagepath=PUBLIC/f'assets/pages/{slug}-{i:02}.jpg'
        if not imagepath.exists():page.get_pixmap(matrix=fitz.Matrix(2,2)).save(imagepath,jpg_quality=85)
        if slug not in ['handles','sofa']:continue
        models=[r for r in ocr if re.fullmatch(r'[12]\d{3}',r['text'])]
        for m in models:
            model=m['text']; y=m['box'][1]
            cat='Sofa legs' if slug=='sofa' else 'Knobs' if model.startswith('20') else 'Door handles'
            p=product(model,cat)
            shared=False
            if slug=='sofa':
                if i==31 and model in ['1501','1502']:
                    region=(0.035 if model=='1501' else 0.515,0.15,0.515 if model=='1501' else 0.98,0.505)
                    photo=(0.075 if model=='1501' else 0.54,0.165,0.51 if model=='1501' else 0.96,0.423)
                elif y<0.5:region=(0.035,0.145,0.98,0.536);photo=(0.048,0.153,0.737,0.531)
                else:region=(0.035,0.54,0.98,0.927);photo=(0.26,0.545,0.955,0.925)
            elif i==23:
                region=(0.08,0.14 if int(model)<=2606 else 0.55,0.92,0.545 if int(model)<=2606 else 0.97)
                photo=region;shared=True
            elif i==30 and model in ['2011','2012']:
                region=(0.025 if model=='2011' else 0.5,0.17,0.5 if model=='2011' else 0.965,0.535)
                photo=(region[0]+0.02,0.175,region[2]-0.005,0.476)
            elif i==22:region=(0.07,0.175,0.92,0.59);photo=(0.095,0.18,0.905,0.52)
            else:
                top=y<0.7
                region=(0.07,0.14 if top else 0.553,0.93,0.553 if top else 0.98)
                photo=(0.095,0.145 if top else 0.56,0.904,0.503 if top else 0.92)
                if 11<=i<=21:photo=(0.095,0.153 if top else 0.563,0.905,0.486 if top else 0.9)
            p['images'].append(dict(src=image_region(page,photo,p['id']),detail=image_region(page,region,p['id']+'-detail'),document=slug,page=i,shared=shared))
            sr=source(p,slug,i,'Catalog')
            included=[r for r in ocr if region[0] <= (r['box'][0]+r['box'][2])/2 <= region[2] and region[1] <= (r['box'][1]+r['box'][3])/2 <= region[3]]
            p['catalogText']='\n'.join(r['text'] for r in sorted(included,key=lambda r:(round(r['box'][1]*80),r['box'][0])) if len(r['text'])>2 and r['text']!=model)
            p['specs']=[t for t in p['catalogText'].split('\n') if re.search(r'\bmm\b|\d+mm|S\.S\.',t,re.I)]
            if shared:p['notes'].append('The catalog picture shows several models. Use the printed model labels to identify this handle.')

# Price columns are assigned by their actual PDF positions, including blanks.
for slug,file in [('handle-prices','Door handle price list.pdf'),('sofa-prices','SOFA LEG (1).pdf')]:
    d=fitz.open(DOCS/file)
    for pn,page in enumerate(d,1):
        headers=[]; current=None; last_variant=None; knob=False
        for row in rows(page):
            texts=[c['text'] for c in row]
            if any('Terms & Conditions' in t for t in texts):break
            if 'PRICE' in texts:
                knob=True;headers=[(next(c['x'] for c in row if c['text']=='PRICE'),'Not specified')];continue
            hs=[(c['x'],re.sub(r'[^0-9]','',c['text'])+' in') for c in row if re.fullmatch(r'\d+[”"’]+',c['text'])]
            if len(hs)>=3:headers=hs;continue
            if not headers:continue
            candidates=[c for c in row if re.fullmatch(r'[12]\d{3}',c['text']) and c['x']<headers[0][0]-20]
            if candidates:current=candidates[0]['text']
            if not current:continue
            nums=[c for c in row if re.fullmatch(r'\d+',c['text']) and c['x']>=headers[0][0]-20 and c['x']<=headers[-1][0]+25]
            cat='Sofa legs' if slug=='sofa-prices' else 'Knobs' if knob else 'Door handles'
            p=product(current,cat)
            if not nums:
                continuation=[c['text'] for c in row if c['x']>headers[-1][0]+30]
                if last_variant and continuation and not any(t in ['COLOUR','SIZE'] for t in continuation):last_variant['finish']+=' '+' '.join(continuation)
                continue
            finish=' '.join(c['text'] for c in row if c['x']>headers[-1][0]+30) or 'Not specified'
            thickness=next((t for t in texts if re.fullmatch(r'\d+(?:\.\d+)?MM',t)),None)
            rates={size:None for x,size in headers}
            for c in nums:
                x,size=min(headers,key=lambda h:abs(h[0]-c['x']))
                assert abs(x-c['x'])<20,(slug,pn,current,c,headers)
                rates[size]=int(c['text'])
            if slug=='sofa-prices' and current in ['1254','1255','1256','1257']:
                rates={'Not specified':next(v for v in rates.values() if v is not None)}
                note='The price list merges the size columns for this model. It does not assign this price to a specific size.'
                if note not in p['notes']:p['notes'].append(note)
            v=dict(finish=finish,thickness=thickness,prices=rates,unit='Listed price',source=dict(document=slug,page=pn))
            p['variants'].append(v);last_variant=v;source(p,slug,pn,'Price list')
            if finish=='Not specified' and cat=='Sofa legs':p['notes'].append('A price row has no finish in the source. No finish was inferred.')
            vals=[n for n in rates.values() if n is not None]
            if len(vals)>1 and any(b<a for a,b in zip(vals,vals[1:])):
                note='A larger size has a lower printed price in at least one row. Values are preserved from the PDF.'
                if note not in p['notes']:p['notes'].append(note)

# Profile tables use merged finish cells. Explicit transcriptions preserve those groups.
d=fitz.open(DOCS/'profile handles.pdf')
def profile(model,pn,groups,box,category='Concealed handles'):
    p=product(model,category);source(p,'profile',pn,'Price list')
    for finish,sizes,prices,count,unit,extra in groups:
        p['variants'].append(dict(finish=finish,prices=dict(zip(sizes,prices)),box=count,unit=unit,source=dict(document='profile',page=pn),**extra))
    p['images'].append(dict(src=crop(d[pn-1],box,p['id']),detail=f'assets/pages/profile-{pn:02}.jpg',document='profile',page=pn,shared=False))
    return p
for n,y0,y1,entries in [
    (1001,159,266,[('C.P','4–30 in',30),('Matt','4–30 in',30),('Black','4–30 in',39),('Rose Gold','4–24 in',39),('Gold','4–24 in',39)]),
    (1002,284,396,[(f,'2–20 in',v) for f,v in [('C.P',30),('Matt',30),('Black',39),('Rose Gold',39),('Gold',39)]]),
    (1003,415,520,[(f,'2–12 in',v) for f,v in [('Matt',34),('Black',48),('Rose Gold',48),('Gold',48)]])]:
    profile('DH-'+str(n),1,[(f,[s],[v],30,'Per inch',{}) for f,s,v in entries],(12,y0,161,y1),'Profile handles')
profile('Folding Table Bracket (Heavy)',1,[('Not specified',[str(s)+' in'],[v],b,'Listed rate',{'weight':str(w)+' kg','boxUnit':'sets'}) for s,v,b,w in [(12,920,25,1.5),(14,1060,20,1.7),(16,1160,20,1.9),(18,1280,16,2.3),(20,1400,16,2.5),(24,1600,12,3)]],(12,541,165,679),'Brackets')
for n,fin,ps,box,y0,y1 in [(1501,'C.P-Black / Matt-Black / Black / Rose Gold / Gold / Antic-Black',[240,312,384,456,528],20,159,281),(1502,'C.P-Black / Matt-Black / Black / Rose Black / Gold Black',[288,360,432,504,576],15,300,419),(1503,'C.P-Black / Matt-Black / Black / Rose Black / Gold Black',[288,360,432,504,576],15,437,555)]:
    profile('DH-'+str(n),2,[(fin,['4 in','6 in','8 in','10 in','12 in'],ps,box,'Listed rate',{})],(12,y0,163,y1))
f1='Black-Black PVD / Black-R.G PVD / Black-Gold PVD'
f2='R.Gold-R.Gold PVD / Gold-Gold PVD / Antic-Black PVD'
f3='Satin-CP'
def concealed(n,pn,sizes,prices,count,box,finishes=None):
    return profile('DH-'+str(n),pn,[(f,[str(s)+' in' for s in sizes],ps,count,'Listed rate',{}) for f,ps in zip(finishes or [f1,f2,f3],prices)],box)
concealed(1504,2,[4,6,8,12],[[360,456,552,774],[400,500,616,832],[320,416,524,704]],15,(12,574,158,753))
concealed(1505,3,[4,6,8,12],[[360,456,552,774],[400,500,616,832],[320,416,524,704]],15,(22.8,159.4,149.5,329.8))
concealed(1506,3,[4,8,12],[[384,600,816],[432,648,864],[360,552,720]],12,(23.5,405.6,148.8,543.7))
concealed(1507,3,[4,8,12],[[384,600,792],[432,648,864],[380,552,720]],15,(23.5,599,148.8,737.8))
concealed(1508,4,[4,6,8,12],[[408,528,648,768],[578,720,888,1056],[432,568,700,840]],15,(35,157.6,156,301.4),['Black-Black PVD','PVD ROSEGOLD / PVD GOLD','ANTIC-GOLD'])
for n,box in [(1509,(31.9,369.6,159.8,521.8)),(1510,(31.3,594.8,160.3,748.3))]:
    concealed(n,4,[4,6,8,12],[[400,512,628,860],[436,556,688,944],[360,476,628,832]],15,box,[f1,f2+' / Pista-Gold PVD / Gray- Black PVD',f3])

# Keep source anomalies visible without silently correcting supplier figures.
product('2605','Door handles')['notes'].append('The 10 in price is printed as 5755. The adjacent models list 575. Confirm this value with the supplier.')
product('1510','Sofa legs')['notes'].append('The 6 in price for finish A is printed as 110. Confirm this value with the supplier.')
product('1202','Sofa legs')['notes'].append('This model appears in the price list but has no matching picture in the catalog. Catalog model 1203 is kept separate.')
for p in products.values():
    if not p['variants']:p['notes'].append('This model appears in the catalog but has no matching price in the supplied lists.')
    p['notes']=list(dict.fromkeys(p['notes']))
    p['sizes']=sorted({s for v in p['variants'] for s,n in v['prices'].items() if n is not None},key=lambda s:float(re.search(r'\d+',s)[0]) if re.search(r'\d+',s) else 999)
    nums=[n for v in p['variants'] for n in v['prices'].values() if n is not None]
    p['minPrice']=min(nums) if nums else None;p['maxPrice']=max(nums) if nums else None
    p['searchText']=' '.join([p['model'],p['category'],p['catalogText'],*p['specs'],*p['sizes'],*(v['finish'] for v in p['variants']),*(v.get('thickness') or '' for v in p['variants'])])
terms=next(x['text'].split('Terms & Conditions',1)[1].strip() for x in pages if x['document']=='sofa-prices' and 'Terms & Conditions' in x['text'])
result=dict(products=sorted(products.values(),key=lambda p:(p['category'],p['model'])),documents=documents,pages=pages,terms=terms,currency=None,priceNote='Prices are transcribed as printed. The supplied price lists do not state a currency. GST is extra. Prices can change without notice.')
(ROOT/'data/catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(dict(products=len(products),variants=sum(len(p['variants']) for p in products.values()),prices=sum(sum(n is not None for n in v['prices'].values()) for p in products.values() for v in p['variants']),pictures=sum(bool(p['images']) for p in products.values()),pages=len(pages),withoutPrices=[p['model'] for p in products.values() if not p['variants']],withoutPictures=[p['model'] for p in products.values() if not p['images']]),indent=2))

# Replace shared photographs with reviewed crops after every data rebuild.
import runpy
runpy.run_path(str(ROOT/'scripts/model-images.py'), run_name='__main__')
