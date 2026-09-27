export const categories=['Door handles','Sofa legs','Knobs','Profile handles','Concealed handles','Brackets'];
export const normalize=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
/** @param {Set<string> | null} saved */
export function findProducts(products,query='',category='',saved=null){
 const tokens=query.trim().split(/\s+/).map(normalize).filter(Boolean);
 return products.filter(product=>(!category||product.category===category)&&(!saved||saved.has(product.id))&&tokens.every(token=>/^(dh)?\d{3,4}$/.test(token)?normalize(product.model).includes(token):normalize(product.searchText).includes(token)));
}
export function swipeAction(dx,dy,velocityX=0){
 if(Math.abs(dx)<Math.abs(dy)*1.3)return null;
 if(Math.abs(dx)<84&&!(Math.abs(dx)>40&&Math.abs(velocityX)>.7))return null;
 return dx>0?'save':'next';
}
export function nextIndex(index,length){return length ? (index+1)%length : 0;}
export function restoreSaved(value,products=null){
 try {const ids=JSON.parse(value||'[]');const known=products?new Set(products.map(p=>p.id)):null;return new Set(Array.isArray(ids)?ids.filter(id=>typeof id==='string'&&(!known||known.has(id))):[]);}catch{return new Set();}
}
