import type { Metadata, Viewport } from 'next';
import { Workspace } from '../components/workspace';
import { getCatalog } from '../lib/data';
import './globals.css';
export const metadata: Metadata={title:{default:'Dalmia Hardware · Product library',template:'%s · Dalmia Hardware'},description:'Search Dalmia Hardware model numbers, individual catalog pictures, finishes, sizes, and source prices.',icons:{icon:'/assets/favicon.svg'}};
export const viewport: Viewport={themeColor:'#171717'};
export const dynamic='force-dynamic';
export default async function RootLayout({children}:{children:React.ReactNode}){const catalog=await getCatalog();return <html lang="en"><body><Workspace total={catalog.products.length} documentCount={catalog.documents.length}>{children}</Workspace></body></html>;}
