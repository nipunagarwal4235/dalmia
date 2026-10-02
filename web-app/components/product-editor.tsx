'use client';
import {useState,useTransition,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '../lib/supabase/client';
import {asset} from '../lib/format';
import type {Product,Variant} from '../lib/types';
type Row={id:string;data:Product;updated_at:string};
const lines=(value:string)=>value.split('\n').map(v=>v.trim()).filter(Boolean);
const blankProduct=():Product=>({id:crypto.randomUUID(),model:'',category:'Door handles',variants:[],images:[],sources:[],notes:[],catalogText:'',specs:[],sizes:[],minPrice:null,maxPrice:null,searchText:''});
export function ProductEditor({products,canManage}:{products:Row[];canManage:boolean}) {
  const [id,setId]=useState(products[0]?.id||'');const [draft,setDraft]=useState<Product|null>(null);
  const row=products.find(p=>p.id===id);
  return <section className="management"><span className="card-category">CATALOG MANAGEMENT</span><h1>Manage products</h1><p>Save changes to update the website and mobile catalog. Manufacturers can edit their assigned products.</p>
    {canManage&&<button className="button" onClick={()=>setDraft(blankProduct())}>Add product</button>}
    {!!products.length&&<label className="account-form" htmlFor="managed-product">Product<select id="managed-product" aria-label="Product" value={id} onChange={e=>{setId(e.target.value);setDraft(null);}}>{products.map(p=><option key={p.id} value={p.id}>{p.data.category} · {p.data.model}</option>)}</select></label>}
    {draft?<Editor key={draft.id} product={draft} canManage onCreated={newId=>{setId(newId);setDraft(null);}}/>:row?<Editor key={row.id+row.updated_at} product={row.data} updatedAt={row.updated_at} canManage={canManage} onCreated={()=>{}}/>:<p>No products are assigned to your account.</p>}
  </section>;
}
function Editor({product,updatedAt,canManage,onCreated}:{product:Product;updatedAt?:string;canManage:boolean;onCreated:(id:string)=>void}) {
  const [data,setData]=useState(product);const [message,setMessage]=useState('');const [working,setBusy]=useState(false);const [refreshing,startTransition]=useTransition();const busy=working||refreshing;const [deleting,setDeleting]=useState(false);const [confirmation,setConfirmation]=useState('');const router=useRouter();
  const field=<K extends keyof Product>(key:K,value:Product[K])=>setData(previous=>({...previous,[key]:value}));
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try {
      const client=createClient();
      const cleanData={...data,specs:lines(data.specs.join('\n')),notes:lines(data.notes.join('\n')),sizes:lines(data.sizes.join('\n'))};
      if(updatedAt){
        const result=await client.from('catalog_products').update({data:cleanData}).eq('id',product.id).eq('updated_at',updatedAt).select('id');
        if(result.error)throw result.error;
        if(!result.data.length)throw new Error('This product or your access changed. Reload before editing.');
      }else{
        const result=await client.rpc('create_catalog_product',{product:cleanData});if(result.error)throw result.error;
        onCreated(data.id);
      }
      setMessage('Product saved.');startTransition(()=>router.refresh());
    }catch(error){setMessage(error instanceof Error?error.message:(error as {message?:string})?.message||'Product save failed.');}finally{setBusy(false);}
  }
  async function upload(file:File){
    setBusy(true);setMessage('');
    try{
      if(!['image/jpeg','image/png'].includes(file.type)||file.size>20*1024*1024)throw new Error('Choose a JPEG or PNG image under 20 MB.');
      const bitmap=await createImageBitmap(file);const width=bitmap.width,height=bitmap.height;bitmap.close();
      const path=`assets/products/${product.id}/${crypto.randomUUID()}.${file.type==='image/png'?'png':'jpg'}`;
      const {error}=await createClient().storage.from('catalog-media').upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
      if(error)throw error;
      field('images',[...data.images,{src:path,detail:path,document:'',page:0,shared:false,width,height}]);
      setMessage('Image uploaded. Save the product to publish it.');
    }catch(error){setMessage((error as Error).message||'Image upload failed.');}finally{setBusy(false);}
  }
  async function remove(){
    if(confirmation!==product.model)return;setBusy(true);
    try{
      const {data:removed,error}=await createClient().from('catalog_products').delete().eq('id',product.id).eq('updated_at',updatedAt!).select('id');
      if(error)throw error;if(!removed.length)throw new Error('This product or your access changed. Reload before deleting.');
      startTransition(()=>router.refresh());
    }catch(error){setMessage((error as Error).message||'Product deletion failed.');}finally{setBusy(false);}
  }
  return <><form className="account-form product-form" onSubmit={submit}><fieldset disabled={busy}>
    <label>Model<input required maxLength={120} value={data.model} onChange={e=>field('model',e.target.value)}/></label>
    <label>Category<input required maxLength={120} list="product-categories" value={data.category} onChange={e=>field('category',e.target.value)}/></label><datalist id="product-categories">{['Door handles','Knobs','Sofa legs','Profile handles','Concealed handles','Brackets'].map(category=><option key={category}>{category}</option>)}</datalist>
    <label>Specifications, one per line<textarea rows={4} value={data.specs.join('\n')} onChange={e=>field('specs',e.target.value.split('\n'))}/></label>
    <label>Notes, one per line<textarea rows={3} value={data.notes.join('\n')} onChange={e=>field('notes',e.target.value.split('\n'))}/></label>
    <label>Sizes, one per line<textarea rows={3} value={data.sizes.join('\n')} onChange={e=>field('sizes',e.target.value.split('\n'))}/></label>
    <h2>Finishes and prices</h2><p>Leave missing prices blank. Keep the rate basis for prices per inch. Original source links stay with existing rows.</p>
    {data.variants.map((variant,index)=><VariantEditor key={index+':'+data.variants.length} variant={variant} index={index} onChange={next=>field('variants',data.variants.map((v,i)=>i===index?next:v))} onRemove={()=>field('variants',data.variants.filter((_,i)=>i!==index))}/>)}
    <button type="button" className="button" onClick={()=>field('variants',[...data.variants,{finish:'',unit:'Per piece',prices:{'Unspecified':null},source:{document:'',page:0,kind:'Dashboard update'}}])}>Add finish</button>
    <h2>Product images</h2><p>The first image appears in the catalog. Removing an image here keeps the original file in storage.</p>
    <div className="editor-images">{data.images.map((image,index)=><div key={image.src}><img src={asset(image.src)} alt={`Product image ${index+1}`} width={150} height={130}/><button type="button" className="button" onClick={()=>field('images',data.images.filter((_,i)=>i!==index))}>Remove image {index+1}</button>{index>0&&<button type="button" className="button" onClick={()=>field('images',[image,...data.images.filter((_,i)=>i!==index)])}>Use as main image</button>}</div>)}</div>
    {updatedAt?<label>Upload product image<input type="file" accept="image/png,image/jpeg" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label>:<p>Save the new product before uploading images.</p>}
    <button className="button primary">{busy?'Please wait…':updatedAt?'Save product':'Create product'}</button>
    </fieldset></form>{message&&<p role="status">{message}</p>}
    {updatedAt&&canManage&&<div className="delete-product"><button className="button" disabled={busy} onClick={()=>setDeleting(!deleting)}>Delete product</button>{deleting&&<div className="account-form"><p>Delete {product.model} from both catalogs and all saved collections. This action cannot be undone. Original image files remain in storage.</p><label>Type {product.model} to delete<input value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button className="button" disabled={busy||confirmation!==product.model} onClick={()=>void remove()}>Permanently delete product</button></div>}</div>}
  </>;
}
function VariantEditor({variant,index,onChange,onRemove}:{variant:Variant;index:number;onChange:(value:Variant)=>void;onRemove:()=>void}){
  const [rows,setRows]=useState(()=>Object.entries(variant.prices).map(([size,price])=>({size,price:price===null?'':String(price)})));
  const updateRows=(next:typeof rows)=>{setRows(next);onChange({...variant,source:{...variant.source,kind:'Dashboard update'},prices:Object.fromEntries(next.map(({size,price})=>[size,price===''?null:Number(price)]))});};
  const duplicate=rows.some((row,i)=>rows.some((other,j)=>i!==j&&row.size.trim()===other.size.trim()));
  return <fieldset className="variant-editor"><legend>Finish {index+1}</legend>
    <label>Finish<input required value={variant.finish} onChange={e=>onChange({...variant,finish:e.target.value})}/></label>
    <label>Rate basis<input required list="rate-bases" value={variant.unit} onChange={e=>onChange({...variant,unit:e.target.value})}/></label><datalist id="rate-bases"><option>Per piece</option><option>Per inch</option><option>Per set</option></datalist>
    <label>Thickness<input value={variant.thickness||''} onChange={e=>onChange({...variant,thickness:e.target.value})}/></label>
    {rows.map((row,i)=><div className="price-editor-row" key={i}><label>Size<input required value={row.size} onChange={e=>{e.target.setCustomValidity('');updateRows(rows.map((r,j)=>i===j?{...r,size:e.target.value}:r));}} onInvalid={e=>e.currentTarget.setCustomValidity('Enter a unique size.')} pattern={duplicate?'(?!)':undefined}/></label><label>Listed price<input aria-label={`Listed price ${index+1}-${i+1}`} type="number" min="0" max="1000000000" step="any" value={row.price} onChange={e=>updateRows(rows.map((r,j)=>i===j?{...r,price:e.target.value}:r))}/></label><button type="button" className="button" onClick={()=>updateRows(rows.filter((_,j)=>i!==j))}>Remove size</button></div>)}
    <button type="button" className="button" onClick={()=>updateRows([...rows,{size:'',price:''}])}>Add size</button><button type="button" className="button" onClick={onRemove}>Remove finish</button>
  </fieldset>;
}
