import type { NextConfig } from 'next';
// Vercel's managed image endpoint bypasses the application authentication proxy.
const config:NextConfig={poweredByHeader:false,reactStrictMode:true,images:{unoptimized:true,remotePatterns:[]},turbopack:{root:process.cwd()}};
export default config;
