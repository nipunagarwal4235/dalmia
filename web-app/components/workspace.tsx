'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Icon } from './icon';
const SavedContext=createContext<{saved:Set<string>;toggle:(id:string)=>void}>({saved:new Set(),toggle:()=>{}});
export const useSaved=()=>useContext(SavedContext);
export function Workspace({children,total,documentCount}:{children:ReactNode;total:number;documentCount:number}) {
 const [saved,setSaved]=useState<Set<string>>(new Set());
 const [ready,setReady]=useState(false);
 const pathname=usePathname();
 useEffect(()=>{try{const ids=JSON.parse(localStorage.getItem('dalmia-shortlist')||'[]');if(Array.isArray(ids))setSaved(new Set(ids.filter(id=>typeof id==='string')));}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('dalmia-shortlist',JSON.stringify([...saved]));}catch{}},[saved,ready]);
 const toggle=(id:string)=>setSaved(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});
 const section=pathname==='/documents'?'Documents':pathname==='/shortlist'?'Shortlist':pathname.startsWith('/models/')?'Model details':'Product library';
 const nav=[{href:'/',icon:'grid',label:'Product library',count:total},{href:'/documents',icon:'folder',label:'Documents',count:documentCount},{href:'/shortlist',icon:'bookmark',label:'Shortlist',count:saved.size}];
 return <SavedContext.Provider value={{saved,toggle}}><a className="skip" href="#main">Skip to content</a><aside className="sidebar"><Link className="brand" href="/" aria-label="Dalmia Hardware home"><span className="brand-mark">D</span><span><strong>Dalmia</strong><small>HARDWARE</small></span></Link><div className="workspace"><span className="workspace-icon">D</span><div>Product workspace<small>Your document collection</small></div></div><p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{nav.map(n=><Link key={n.href} href={n.href} className={'nav-item '+((pathname===n.href||(n.href==='/'&&pathname.startsWith('/models/')))?'active':'')} aria-label={n.label} aria-current={pathname===n.href?'page':undefined}><Icon name={n.icon}/>{n.label}<span className="nav-count" id={n.href==='/shortlist'?'saved-count':undefined}>{n.count}</span></Link>)}</nav><div className="sidebar-bottom"><span className="live-dot"/>From your source documents<p>Catalog pictures and prices,<br/>together in one place.</p><span className="sidebar-rule"/><small>DALMIA HARDWARE COLLECTION</small></div></aside><div className="shell"><header className="topbar"><div><span className="muted">Workspace</span><span className="slash">/</span><span>{section}</span></div><Link className="text-button" href="/documents"><Icon name="folder"/><span>Source documents</span><Icon name="arrowUpRight"/></Link></header><main id="main">{children}<footer><span>Dalmia Hardware <span className="dot">·</span> Your catalog, connected.</span><span>Prices as printed in the source PDFs. GST extra.</span></footer></main></div></SavedContext.Provider>;
}
export function SaveButton({id,model,category,compact=false}:{id:string;model:string;category:string;compact?:boolean}){const {saved,toggle}=useSaved();const selected=saved.has(id);return <button className={compact?'save '+(selected?'saved':''):'button'} aria-label={compact?`${selected?'Remove':'Save'} ${model} ${category} ${selected?'from':'to'} shortlist`:undefined} aria-pressed={selected} onClick={()=>toggle(id)}><Icon name={selected&&!compact?'check':'bookmark'}/>{!compact&&(selected?'Saved to shortlist':'Save to shortlist')}</button>;}
