import type { NextConfig } from 'next';
const storageHost=process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL):null;
const config:NextConfig={poweredByHeader:false,reactStrictMode:true,images:{formats:['image/webp'],remotePatterns:storageHost?[{protocol:storageHost.protocol.slice(0,-1) as 'https'|'http',hostname:storageHost.hostname,port:storageHost.port,pathname:'/storage/v1/object/public/catalog-media/**',search:''}]:[]},turbopack:{root:process.cwd()}};
export default config;
