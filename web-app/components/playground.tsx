'use client';
import {useEffect,useMemo,useReducer,useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {Product} from '../lib/types';
import {asset,modelPath} from '../lib/format';
import {priceAmount} from '../lib/pricing.mjs';
import {templates,finishes,floors,fittingKinds,slotLabels,slotSingular,kindOf,fits,buildFurniture,slotsIn,defaultSpots,autoFit,syncFittings,fittingSizes,defaultSize,unitPrice,applyBasis,priceBases,billOfMaterials,bomCSV,liftFor,toMillimetres,fromMillimetres,encodeDesign,decodeDesign,newDesign,newId,templateFor,faceOf} from '../lib/playground.mjs';
import {useSaved} from './workspace';
import {Icon} from './icon';
import type {PlaygroundScene,Fitting,Part,View} from './playground-scene';

type Design={type:string;params:Record<string,string|number|boolean>;fittings:Fitting[];finishes:{front:string;body:string;soft:string};room:{wall:boolean;floor:string}};
type History={past:Design[];present:Design;future:Design[]};
type Action={type:'set';design:Design;from?:Design}|{type:'patch';design:Design}|{type:'undo'}|{type:'redo'};
type Saved={name:string;savedAt:string;design:string};
const SAVED='dalmia-playground-designs',CURRENT='dalmia-playground-current';
function history(h:History,a:Action):History{
 if(a.type==='patch')return {...h,present:a.design};
 if(a.type==='set')return {past:[...h.past,a.from??h.present].slice(-100),present:a.design,future:[]};
 if(a.type==='undo')return h.past.length?{past:h.past.slice(0,-1),present:h.past.at(-1)!,future:[h.present,...h.future]}:h;
 return h.future.length?{past:[...h.past,h.present],present:h.future[0],future:h.future.slice(1)}:h;
}
const read=<T,>(key:string,fallback:T):T=>{try{const v=localStorage.getItem(key);return v?JSON.parse(v) as T:fallback;}catch{return fallback;}};
const write=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const src=(p:Product)=>'/'+p.model3d;
const label=(slot:string)=>slotLabels[slot as keyof typeof slotLabels]??slot;
const single=(slot:string)=>slotSingular[slot as keyof typeof slotSingular]??slot;
const allOf=(slot:string)=>slot==='entry'?'the entrance door':`all ${label(slot)}`;
const views:[View,string][]=[['angle','Angle'],['front','Front'],['side','Side'],['top','Top'],['selected','Fitting']];
const download=(href:string,name:string)=>{const a=document.createElement('a');a.href=href;a.download=name;a.click();};

export function Playground({products,priceNote,add,shared}:{products:Product[];priceNote:string;add?:string;shared?:string}){
 const usable=useMemo(()=>products.filter(p=>p.model3d&&kindOf(p.category)),[products]);
 const byId=useMemo(()=>new Map(usable.map(p=>[p.id,p])),[usable]);
 const ids=useMemo(()=>usable.map(p=>p.id),[usable]);
 const [h,dispatch]=useReducer(history,undefined,()=>({past:[],present:newDesign() as Design,future:[]}));
 const design=h.present;
 const [ready,setReady]=useState(false);const [armed,setArmed]=useState<string|null>(null);const [snap,setSnap]=useState(true);
 const [selected,setSelected]=useState<string|null>(null);const [tab,setTab]=useState<'fittings'|'selected'|'bill'|'designs'>('fittings');
 const [variants,setVariants]=useState<Record<string,string[]>>({});const [loading,setLoading]=useState(0);const [notice,setNotice]=useState('');
 const [open,setOpen]=useState(false);const [basis,setBasis]=useState('listed');const [query,setQuery]=useState('');const [category,setCategory]=useState('');
 const [savedList,setSavedList]=useState<Saved[]>([]);const [name,setName]=useState('');const [sceneError,setSceneError]=useState('');
 const host=useRef<HTMLDivElement>(null);const scene=useRef<PlaygroundScene|null>(null);
 const [sceneTick,setSceneTick]=useState(0);
 const live=useRef({design,armed,snap,variants,parts:[] as Part[]});
 const dragFrom=useRef<Design|null>(null);
 const {saved,toggle}=useSaved();

 const t=templates[design.type as keyof typeof templates];
 const baseParts=useMemo(()=>buildFurniture(design.type,design.params) as Part[],[design.type,design.params]);
 const lift=liftFor(design.fittings,baseParts);
 const parts=useMemo(()=>buildFurniture(design.type,design.params,lift) as Part[],[design.type,design.params,lift]);
 const slots=slotsIn(parts) as string[];
 live.current={design,armed,snap,variants,parts};
 const selectedFitting=design.fittings.find(f=>f.id===selected);
 const bom=billOfMaterials(design.fittings,usable,basis);
 const commit=(next:Design)=>dispatch({type:'set',design:next});
 const setFittings=(fittings:Fitting[])=>commit({...design,fittings});
 const slide=(next:Design)=>dispatch(dragFrom.current?{type:'patch',design:next}:{type:'set',design:next});
 const endSlide=()=>{if(dragFrom.current){dispatch({type:'set',design:live.current.design,from:dragFrom.current});dragFrom.current=null;}};
 const flash=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(n=>n===text?'':n),3500);};

 // Starting design: a shared link, then a product opened from its page, then this browser's last design.
 useEffect(()=>{
  const fromLink=shared?decodeDesign(shared,ids):null,product=add?byId.get(add):undefined;
  let start:Design|null=fromLink as Design|null;
  if(!start&&product){start=newDesign(templateFor(product.category)) as Design;setArmed(product.id);}
  if(!start){const last=read<string|null>(CURRENT,null);start=last?decodeDesign(last,ids) as Design|null:null;}
  if(start)dispatch({type:'patch',design:start});
  if(shared&&!fromLink)flash('This design link is invalid or out of date.');
  setSavedList(read<Saved[]>(SAVED,[]));setReady(true);
 },[]);
 useEffect(()=>{if(ready)write(CURRENT,encodeDesign(design));},[design,ready]);

 useEffect(()=>{
  let cancelled=false;
  import('./playground-scene').then(({PlaygroundScene})=>{
   if(cancelled||!host.current)return;
   try{
    scene.current=new PlaygroundScene(host.current,{
     select:id=>{setSelected(id);if(id)setTab('selected');},
     place:(part,u,v)=>place(part,u,v),
     move:(id,u,v,done)=>{
      const d=live.current.design;if(!dragFrom.current)dragFrom.current=d;
      const next={...d,fittings:d.fittings.map(f=>f.id===id?{...f,u,v}:f)};
      if(done){dispatch({type:'set',design:next,from:dragFrom.current});dragFrom.current=null;}else dispatch({type:'patch',design:next});
     },
     variants:(s,names)=>setVariants(m=>({...m,[s]:names})),
     loading:setLoading,
     error:flash,
    });
    setSceneTick(n=>n+1);
   }catch{setSceneError('3D needs WebGL. Turn on hardware acceleration in your browser or try another browser.');}
  });
  return()=>{cancelled=true;scene.current?.dispose();scene.current=null;};
 },[]);
 const framed=useRef('');
 useEffect(()=>{
  const s=scene.current;if(!s)return;
  s.setFurniture(parts,design.finishes,design.room);
  const key=design.type;if(framed.current!==key){framed.current=key;s.view('angle');}
 },[parts,design.finishes,design.room,design.type,sceneTick]);
 useEffect(()=>{scene.current?.setFittings(design.fittings,id=>src(byId.get(id)!));},[design.fittings,parts,byId,sceneTick]);
 useEffect(()=>{scene.current?.select(selected);},[selected,design.fittings,sceneTick]);
 useEffect(()=>{const p=armed&&byId.get(armed);scene.current?.setPlacing(p?fittingKinds[p.category as keyof typeof fittingKinds].slots:null);},[armed,byId,sceneTick]);
 useEffect(()=>{scene.current?.setOpen(open?1:0);},[open,sceneTick]);
 // Fittings placed before their file loaded take the first finish once it is known.
 useEffect(()=>{
  const missing=design.fittings.some(f=>!f.finish&&variants[src(byId.get(f.product)!)]?.length);
  if(missing)dispatch({type:'patch',design:{...design,fittings:design.fittings.map(f=>f.finish?f:{...f,finish:variants[src(byId.get(f.product)!)]?.[0]})}});
 },[variants,design,byId]);

 function place(partId:string,u:number,v:number){
  const {design:d,armed:a,snap:s,variants:vs,parts:ps}=live.current,product=a&&byId.get(a),part=ps.find(p=>p.id===partId);
  if(!product||!part)return;
  const kind=kindOf(product.category)!,spots=defaultSpots(part,kind) as {u:number;v:number;spin:number}[];
  const spot=s?spots.reduce((best,x)=>Math.hypot(x.u-u,x.v-v)<Math.hypot(best.u-u,best.v-v)?x:best):{...spots[0],u,v};
  const same=d.fittings.find(f=>f.product===product.id);
  const fitting:Fitting={id:newId(),product:product.id,kind,part:partId,u:spot.u,v:spot.v,spin:spot.spin,tilt:0,finish:same?.finish??vs[src(product)]?.[0],size:same?.size??defaultSize(product)};
  dispatch({type:'set',design:{...d,fittings:[...d.fittings,fitting]}});setSelected(fitting.id);
 }
 const update=(id:string,change:Partial<Fitting>)=>setFittings(design.fittings.map(f=>f.id===id?{...f,...change}:f));
 const remove=(id:string)=>{setFittings(design.fittings.filter(f=>f.id!==id));setSelected(null);};
 function fitAll(product:Product,slot?:string){
  const prev=design.fittings.find(f=>f.product===product.id);
  const next=autoFit(parts,design.fittings,product,{onlySlot:slot,finish:prev?.finish??variants[src(product)]?.[0],size:prev?.size}) as Fitting[];
  setFittings(next);setArmed(null);
  flash(`${product.model} fitted to ${slot?allOf(slot):'every suitable part'}.`);
 }
 function changeFurniture(type:string,params?:Record<string,unknown>){
  const next={...design,type,params:params??(newDesign(type).params)} as Design;
  const nextParts=buildFurniture(next.type,next.params);
  const sync=syncFittings(nextParts,design.fittings,usable);
  commit({...next,fittings:sync.fittings as Fitting[]});
  if(sync.removed&&type!==design.type)flash(`${sync.removed} fitting${sync.removed>1?'s':''} did not suit the ${templates[type as keyof typeof templates].label.toLowerCase()} and were removed.`);
  if(selected&&!sync.fittings.some((f:Fitting)=>f.id===selected))setSelected(null);
 }

 useEffect(()=>{
  function key(e:KeyboardEvent){
   const target=e.target as HTMLElement;if(['INPUT','SELECT','TEXTAREA'].includes(target.tagName))return;
   const d=live.current.design,f=d.fittings.find(x=>x.id===selected);
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();dispatch({type:e.shiftKey?'redo':'undo'});return;}
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y'){e.preventDefault();dispatch({type:'redo'});return;}
   if(e.key==='Escape'){setArmed(null);setSelected(null);return;}
   if(!f)return;
   if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();dispatch({type:'set',design:{...d,fittings:d.fittings.filter(x=>x.id!==f.id)}});setSelected(null);}
   if(e.key==='r'||e.key==='R'){dispatch({type:'set',design:{...d,fittings:d.fittings.map(x=>x.id===f.id?{...x,spin:((x.spin+(e.shiftKey?-90:90))%360)}:x)}});}
   const part=parts.find(p=>p.id===f.part);
   if(part&&e.key.startsWith('Arrow')){
    e.preventDefault();const step=e.shiftKey?20:5,mm=toMillimetres(part,f.u,f.v);
    const across=mm.across+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),up=mm.up+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0);
    dispatch({type:'set',design:{...d,fittings:d.fittings.map(x=>x.id===f.id?{...x,...fromMillimetres(part,across,up)}:x)}});
   }
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[selected,parts]);

 const suitable=usable.filter(p=>slots.some(s=>fits(p.category,s)));
 const categories=[...new Set(suitable.map(p=>p.category))];
 const chosen=categories.includes(category)?category:'';
 const shown=suitable.filter(p=>(!chosen||p.category===chosen)&&(!query||`${p.model} ${p.category}`.toLowerCase().includes(query.toLowerCase())));
 const armedProduct=armed?byId.get(armed):undefined;
 const unsuitable=[...new Set(usable.map(p=>p.category))].filter(c=>!categories.includes(c));

 function saveDesign(){
  const title=name.trim()||`${t.label} ${new Date().toLocaleDateString()}`;
  const list=[{name:title,savedAt:new Date().toISOString(),design:encodeDesign(design)},...savedList.filter(s=>s.name!==title)].slice(0,30);
  setSavedList(list);write(SAVED,list);setName('');flash(`Saved “${title}” in this browser.`);
 }
 function loadDesign(text:string){const d=decodeDesign(text,ids) as Design|null;if(!d){flash('That design could not be opened.');return;}commit(d);setSelected(null);framed.current='';}
 async function share(){
  const url=`${location.origin}/playground?design=${encodeDesign(design)}`;
  try{await navigator.clipboard.writeText(url);flash('Share link copied. People need to sign in to open it.');}catch{window.prompt('Copy this link',url);}
 }
 function preset(type:string,category:string,finishIndex=0){
  const product=usable.find(p=>p.category===category);if(!product)return;
  const d=newDesign(type) as Design,p=buildFurniture(type,d.params);
  const finish=variants[src(product)]?.[finishIndex];
  loadDesign(encodeDesign({...d,fittings:autoFit(p,[],product,{finish})}));
 }
 const saveAll=()=>{const ids=[...new Set(design.fittings.map(f=>f.product))].filter(id=>!saved.has(id));ids.forEach(toggle);flash(ids.length?`${ids.length} product${ids.length>1?'s':''} added to your shortlist.`:'Every product here is already on your shortlist.');};
 const sp=selectedFitting&&byId.get(selectedFitting.product),selectedPart=selectedFitting&&parts.find(p=>p.id===selectedFitting.part);

 return <div className="playground">
  <section className="pg-panel pg-furniture" aria-label="Furniture">
   <span className="card-category">FURNITURE</span>
   <div className="pg-templates">{Object.entries(templates).map(([key,tpl])=><button key={key} className={'pg-template '+(design.type===key?'active':'')} aria-pressed={design.type===key} onClick={()=>design.type!==key&&changeFurniture(key)}><strong>{tpl.label}</strong><small>{tpl.description}</small></button>)}</div>
   <h3>Size and layout</h3>
   {t.params.map(p=>{
    const value=design.params[p.key as keyof typeof design.params] as unknown;
    const set=(v:unknown)=>changeFurniture(design.type,{...design.params,[p.key]:v});
    if('options' in p&&p.options)return <label key={p.key} className="pg-field">{p.label}<select value={String(value)} onChange={e=>set(e.target.value)}>{p.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
    if('type' in p&&p.type==='toggle')return <label key={p.key} className="check-row"><input type="checkbox" checked={!!value} onChange={e=>set(e.target.checked)}/>{p.label}</label>;
    const n=p as {key:string;label:string;min:number;max:number;step:number;unit?:string};
    return <label key={p.key} className="pg-field">{p.label}<span className="pg-range"><input type="range" min={n.min} max={n.max} step={n.step} value={Number(value)} onChange={e=>{const params={...design.params,[p.key]:Number(e.target.value)};slide({...design,params,fittings:syncFittings(buildFurniture(design.type,params),design.fittings,usable).fittings as Fitting[]});}} onPointerDown={()=>{dragFrom.current=design;}} onPointerUp={endSlide}/><output>{Number(value)}{n.unit?` ${n.unit}`:''}</output></span></label>;
   })}
   <h3>Finishes</h3>
   <label className="pg-field">Fronts<select value={design.finishes.front} onChange={e=>commit({...design,finishes:{...design.finishes,front:e.target.value}})}>{finishes.front.map(f=><option key={f}>{f}</option>)}</select></label>
   <label className="pg-field">Body<select value={design.finishes.body} onChange={e=>commit({...design,finishes:{...design.finishes,body:e.target.value}})}>{finishes.body.map(f=><option key={f}>{f}</option>)}</select></label>
   <label className="pg-field">Upholstery and worktop<select value={design.finishes.soft} onChange={e=>commit({...design,finishes:{...design.finishes,soft:e.target.value}})}>{finishes.soft.map(f=><option key={f}>{f}</option>)}</select></label>
   <h3>Room</h3>
   <label className="pg-field">Floor<select value={design.room.floor} onChange={e=>commit({...design,room:{...design.room,floor:e.target.value}})}>{floors.map(f=><option key={f}>{f}</option>)}</select></label>
   <label className="check-row"><input type="checkbox" checked={design.room.wall} onChange={e=>commit({...design,room:{...design.room,wall:e.target.checked}})}/>Back wall</label>
   {lift!==100&&slots.includes('leg')&&<p className="pg-hint">Raised {Math.round(lift)} mm on the attached legs.</p>}
  </section>

  <section className="pg-stage" aria-label="3D playground">
   <div className="pg-toolbar">
    <div className="pg-group" role="group" aria-label="Camera">{views.map(([v,l])=><button key={v} className="pg-tool" disabled={v==='selected'&&!selected} onClick={()=>scene.current?.view(v)}>{l}</button>)}</div>
    <div className="pg-group"><button className="pg-tool" aria-pressed={open} onClick={()=>setOpen(!open)}>{open?'Close fronts':'Open fronts'}</button><button className="pg-tool" disabled={!h.past.length} onClick={()=>dispatch({type:'undo'})} aria-label="Undo">Undo</button><button className="pg-tool" disabled={!h.future.length} onClick={()=>dispatch({type:'redo'})} aria-label="Redo">Redo</button><button className="pg-tool" onClick={()=>{const png=scene.current?.screenshot();if(png)download(png,`${t.label.toLowerCase().replaceAll(' ','-')}-fittings.png`);}}><Icon name="download"/>Image</button></div>
   </div>
   <div className="pg-canvas" ref={host}>{sceneError&&<p className="pg-error" role="alert">{sceneError}</p>}</div>
   {loading>0&&<p className="loading pg-loading" role="status">Loading 3D fittings…</p>}
   {armedProduct&&<div className="pg-banner" role="status"><span>Placing <strong>{armedProduct.model}</strong>. Click a highlighted {fittingKinds[armedProduct.category as keyof typeof fittingKinds].slots.filter(s=>slots.includes(s)).map(single).join(' or ')}.</span><label className="check-row"><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Snap to recommended spot</label><button className="button" onClick={()=>setArmed(null)}>Done</button></div>}
   {notice&&<p className="toast" role="status">{notice}</p>}
   <p className="pg-summary">{design.fittings.length} fitting{design.fittings.length===1?'':'s'} · {priceBases.find(b=>b.key===basis)?.label} {priceAmount(bom.total)}{bom.unpriced?` + ${bom.unpriced} unpriced`:''}<span className="pg-keys">Drag a selected fitting to move it · R rotates · arrows nudge · Delete removes</span></p>
  </section>

  <section className="pg-panel pg-side" aria-label="Fittings">
   <div className="pg-tabs" role="tablist">{([['fittings','Fittings'],['selected','Selected'],['bill','Bill'],['designs','Designs']] as const).map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{l}{k==='bill'&&design.fittings.length?<span>{design.fittings.length}</span>:null}</button>)}</div>

   {tab==='fittings'&&<div role="tabpanel">
    <div className="searchbar pg-search"><span><Icon name="search"/></span><input type="search" placeholder="Search fittings" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search fittings"/></div>
    <div className="pg-chips"><button className={'chip '+(!chosen?'active':'')} onClick={()=>setCategory('')}>All suitable · {suitable.length}</button>{categories.map(c=><button key={c} className={'chip '+(chosen===c?'active':'')} onClick={()=>setCategory(c)}>{c} · {suitable.filter(p=>p.category===c).length}</button>)}</div>
    {unsuitable.length>0&&<p className="pg-hint">{unsuitable.join(', ')} do not fit a {t.label.toLowerCase()}. Choose other furniture to try them.</p>}
    <div className="pg-products">{shown.map(p=>{
     const img=p.images[0],own=fittingKinds[p.category as keyof typeof fittingKinds].slots.filter(s=>slots.includes(s)),count=design.fittings.filter(f=>f.product===p.id).length;
     return <article key={p.id} className={'pg-product '+(armed===p.id?'armed':'')}>
      <div className="pg-thumb">{img?<Image src={asset(img.src)} alt="" width={img.width} height={img.height} unoptimized/>:<Icon name="image"/>}</div>
      <div><strong>{p.model}</strong><small>{p.category}{p.minPrice!=null?` · from ${priceAmount(p.minPrice)}`:''}{count?` · ${count} placed`:''}</small>
       <div className="pg-actions"><button className="text-button" aria-pressed={armed===p.id} onClick={()=>setArmed(armed===p.id?null:p.id)}>{armed===p.id?'Cancel':'Place'}</button>{own.map(s=><button key={s} className="text-button" onClick={()=>fitAll(p,s)}>{s==='entry'?'Entrance door':`All ${label(s)}`}</button>)}</div>
      </div>
     </article>;
    })}{!shown.length&&<p className="pg-hint">No fittings match your search.</p>}</div>
   </div>}

   {tab==='selected'&&<div role="tabpanel">
    {selectedFitting&&sp&&selectedPart?<div className="pg-inspector">
     <div className="pg-product"><div className="pg-thumb">{sp.images[0]?<Image src={asset(sp.images[0].src)} alt="" width={sp.images[0].width} height={sp.images[0].height} unoptimized/>:null}</div><div><strong>{sp.model}</strong><small>{sp.category} on {selectedPart.label}</small><Link className="text-button" href={modelPath(sp.id)}>Product details<Icon name="arrowUpRight"/></Link></div></div>
     {(variants[src(sp)]?.length??0)>1&&<><h3>Finish</h3><div className="finish-picker" role="radiogroup" aria-label="Finish">{variants[src(sp)].map(f=><button key={f} type="button" role="radio" aria-checked={f===selectedFitting.finish} onClick={()=>update(selectedFitting.id,{finish:f})}>{f}</button>)}</div></>}
     {fittingSizes(sp).length>0&&<label className="pg-field">Size<select value={selectedFitting.size??''} onChange={e=>update(selectedFitting.id,{size:e.target.value})}>{fittingSizes(sp).map((s:string)=><option key={s}>{s}</option>)}</select></label>}
     <p className="pg-price">Unit price <strong>{priceAmount(applyBasis(unitPrice(sp,selectedFitting.finish,selectedFitting.size),basis))}</strong> <small>{priceBases.find(b=>b.key===basis)?.label}</small></p>
     <h3>Position</h3>
     {(()=>{const mm=toMillimetres(selectedPart,selectedFitting.u,selectedFitting.v),front=faceOf(selectedPart.slot)==='front';
      const set=(across:number,up:number)=>update(selectedFitting.id,fromMillimetres(selectedPart,across,up));
      return <div className="pg-grid2"><label className="pg-field">From left (mm)<input type="number" value={mm.across} onChange={e=>set(Number(e.target.value),mm.up)}/></label><label className="pg-field">{front?'From bottom':'From back'} (mm)<input type="number" value={mm.up} onChange={e=>set(mm.across,Number(e.target.value))}/></label></div>;})()}
     <div className="pg-actions"><button className="button" onClick={()=>update(selectedFitting.id,{u:.5})}>Centre across</button><button className="button" onClick={()=>{const spots=defaultSpots(selectedPart,selectedFitting.kind) as {u:number;v:number;spin:number}[];const s=spots.reduce((b,x)=>Math.hypot(x.u-selectedFitting.u,x.v-selectedFitting.v)<Math.hypot(b.u-selectedFitting.u,b.v-selectedFitting.v)?x:b);update(selectedFitting.id,s);}}>Snap to recommended</button></div>
     <label className="pg-field">Move to<select value={selectedFitting.part} onChange={e=>{const p=parts.find(x=>x.id===e.target.value)!;update(selectedFitting.id,{part:p.id,...(defaultSpots(p,selectedFitting.kind) as {u:number;v:number;spin:number}[])[0]});}}>{parts.filter(p=>p.slot&&fits(sp.category,p.slot)).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
     <h3>Rotation</h3>
     <div className="pg-actions"><button className="button" onClick={()=>update(selectedFitting.id,{spin:(selectedFitting.spin-90)%360})}>Rotate left</button><button className="button" onClick={()=>update(selectedFitting.id,{spin:(selectedFitting.spin+90)%360})}>Rotate right</button></div>
     <label className="pg-field">Angle<span className="pg-range"><input type="range" min={-180} max={180} step={5} value={((selectedFitting.spin+540)%360)-180} onChange={e=>slide({...design,fittings:design.fittings.map(f=>f.id===selectedFitting.id?{...f,spin:Number(e.target.value)}:f)})} onPointerDown={()=>{dragFrom.current=design;}} onPointerUp={endSlide}/><output>{((selectedFitting.spin+540)%360)-180}°</output></span></label>
     <label className="pg-field">Tilt<select value={String(((selectedFitting.tilt%360)+360)%360)} onChange={e=>update(selectedFitting.id,{tilt:Number(e.target.value)})}>{[0,90,180,270].map(a=><option key={a} value={a}>{a}°</option>)}</select></label>
     <h3>Apply</h3>
     <div className="pg-actions">
      <button className="button" onClick={()=>{const p=parts.find(x=>x.id===selectedFitting.part)!;setFittings(autoFit(parts,design.fittings,sp,{onlySlot:p.slot,finish:selectedFitting.finish,size:selectedFitting.size}) as Fitting[]);flash(`Copied to ${allOf(p.slot!)}.`);}}>Copy to {allOf(selectedPart.slot!)}</button>
      <button className="button" onClick={()=>{setFittings(design.fittings.map(f=>f.product===sp.id?{...f,finish:selectedFitting.finish,size:selectedFitting.size}:f));flash(`Every ${sp.model} now uses this finish and size.`);}}>Match every {sp.model}</button>
      <button className="button" onClick={()=>{const copy={...selectedFitting,id:newId(),u:Math.min(1,selectedFitting.u+.08)};setFittings([...design.fittings,copy]);setSelected(copy.id);}}>Duplicate</button>
      <button className="button" onClick={()=>remove(selectedFitting.id)}>Remove</button>
     </div>
     <label className="pg-field">Swap for<select value={sp.id} onChange={e=>{const p=byId.get(e.target.value)!;update(selectedFitting.id,{product:p.id,finish:variants[src(p)]?.[0],size:defaultSize(p)});}}>{usable.filter(p=>kindOf(p.category)===selectedFitting.kind&&fits(p.category,selectedPart.slot!)).map(p=><option key={p.id} value={p.id}>{p.category} · {p.model}</option>)}</select></label>
    </div>:<p className="pg-hint">Click a fitting in the scene, or choose one below, to change its finish, size, position or angle.</p>}
    <h3>On this {t.label.toLowerCase()}</h3>
    {design.fittings.length?<ul className="pg-list">{parts.filter(p=>design.fittings.some(f=>f.part===p.id)).map(p=><li key={p.id}><small>{p.label}</small>{design.fittings.filter(f=>f.part===p.id).map(f=><button key={f.id} className={'text-button '+(f.id===selected?'active':'')} aria-pressed={f.id===selected} onClick={()=>setSelected(f.id)}>{byId.get(f.product)?.model} · {f.finish??'Loading finish'}{f.size?` · ${f.size}`:''}</button>)}</li>)}</ul>:<p className="pg-hint">Nothing attached yet. Open the Fittings tab and choose Place or an “All” button.</p>}
   </div>}

   {tab==='bill'&&<div role="tabpanel">
    <label className="pg-field">Price basis<select value={basis} onChange={e=>setBasis(e.target.value)}>{priceBases.map(b=><option key={b.key} value={b.key}>{b.label}</option>)}</select></label>
    {bom.rows.length?<div className="table-scroll"><table className="pg-bill"><thead><tr><th>Fitting</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>{bom.rows.map(r=><tr key={r.key}><td><strong>{r.product.model}</strong><small>{r.product.category}{r.finish?` · ${r.finish}`:''}{r.size?` · ${r.size}`:''}</small></td><td>{r.quantity}</td><td>{priceAmount(r.unit)}</td><td>{priceAmount(r.total)}</td></tr>)}</tbody><tfoot><tr><td>Total</td><td>{bom.count}</td><td/><td>{priceAmount(bom.total)}</td></tr></tfoot></table></div>:<p className="pg-hint">Attach fittings to see quantities and prices.</p>}
    {bom.unpriced>0&&<p className="pg-hint">{bom.unpriced} line{bom.unpriced>1?'s have':' has'} no catalog price for the chosen finish or size and {bom.unpriced>1?'are':'is'} left out of the total.</p>}
    <p className="pg-hint">{priceNote}</p>
    <div className="pg-actions"><button className="button" disabled={!bom.rows.length} onClick={()=>download(URL.createObjectURL(new Blob([bomCSV(bom,t.label)],{type:'text/csv'})),`${t.label.toLowerCase().replaceAll(' ','-')}-fittings.csv`)}><Icon name="download"/>Download CSV</button><button className="button" disabled={!bom.rows.length} onClick={saveAll}><Icon name="bookmark"/>Save all to shortlist</button></div>
   </div>}

   {tab==='designs'&&<div role="tabpanel">
    <h3>Save this design</h3>
    <div className="pg-save"><input placeholder={`${t.label} design`} value={name} onChange={e=>setName(e.target.value)} maxLength={60} aria-label="Design name"/><button className="button primary" onClick={saveDesign}>Save</button></div>
    <div className="pg-actions"><button className="button" onClick={()=>void share()}>Copy share link</button><button className="button" onClick={()=>{commit(newDesign(design.type) as Design);setSelected(null);}}>Start over</button></div>
    <h3>Saved in this browser</h3>
    {savedList.length?<ul className="pg-list">{savedList.map(s=><li key={s.name}><span><strong>{s.name}</strong><small>{new Date(s.savedAt).toLocaleString()}</small></span><span className="pg-actions"><button className="text-button" onClick={()=>loadDesign(s.design)}>Open</button><button className="text-button" onClick={()=>{const list=savedList.filter(x=>x.name!==s.name);setSavedList(list);write(SAVED,list);}}>Delete</button></span></li>)}</ul>:<p className="pg-hint">Saved designs appear here.</p>}
    <h3>Start from an idea</h3>
    <div className="pg-templates">
     <button className="pg-template" onClick={()=>preset('wardrobe','Door handles')}><strong>Wardrobe with pull handles</strong><small>Three doors, matching drawer pull</small></button>
     <button className="pg-template" onClick={()=>preset('kitchen','Profile handles')}><strong>Kitchen with profile handles</strong><small>Base and wall units</small></button>
     <button className="pg-template" onClick={()=>preset('dresser','Knobs')}><strong>Chest of drawers with knobs</strong><small>Four drawer rows</small></button>
     <button className="pg-template" onClick={()=>preset('sofa','Sofa legs')}><strong>Sofa on six legs</strong><small>Three seats</small></button>
     <button className="pg-template" onClick={()=>preset('tvunit','Concealed handles')}><strong>TV unit with concealed handles</strong><small>Flaps and drawers on legs</small></button>
     <button className="pg-template" onClick={()=>preset('foldingtable','Brackets')}><strong>Wall folding table</strong><small>Two folding brackets</small></button>
    </div>
   </div>}
  </section>
 </div>;
}
