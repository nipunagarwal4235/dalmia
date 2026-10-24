import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata={title:{default:'Dalmia Hardware · Product library',template:'%s · Dalmia Hardware'},description:'Search Dalmia Hardware model numbers, individual catalog pictures, finishes, sizes, and source prices.',icons:{icon:'/assets/favicon.svg'}};
export const viewport: Viewport={themeColor:'#171717'};
export const dynamic='force-dynamic';
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
