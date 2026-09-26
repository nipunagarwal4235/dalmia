'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty"><h1>The page could not load.</h1><p>Please try again.</p><button className="button" onClick={reset}>Try again</button></div>;}
