import Link from 'next/link';
import Image from 'next/image';

export function AuthShell({children}:{children:React.ReactNode}) {
  return <main className="auth-shell"><Link className="auth-brand" href="/login" aria-label="Dalmia Hardware sign in"><Image src="/assets/dalmia-wordmark.svg" alt="Dalmia Hardware" width={226} height={68} unoptimized/></Link>{children}<p className="auth-footer">Your Dalmia Hardware account</p></main>;
}
