import Link from 'next/link';
export default function NotFound(){return <div className="empty"><h1>Model not found</h1><p>This model or page is not in the collection.</p><Link href="/" className="button">Return to the library</Link></div>;}
