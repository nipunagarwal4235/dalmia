import type { ReactNode } from 'react';
const icons: Record<string,ReactNode> = {
 grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
 folder:<><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/></>,
 bookmark:<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4Z"/>,
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
 download:<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>,
 arrowUpRight:<path d="M6 18 18 6M6 6h12v12"/>,
 arrowRight:<path d="M4 12h16m-6-6 6 6-6 6"/>,
 arrowLeft:<path d="M20 12H4m6-6-6 6 6 6"/>,
 x:<path d="m6 6 12 12M6 18 18 6"/>,
 list:<path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/>,
 tag:<><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/></>,
 image:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 5 5 3-3 5 5"/></>,
 check:<path d="m5 12 4 4L19 6"/>,
};
export function Icon({name}:{name:string}) {return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] || icons.folder}</svg>;}
