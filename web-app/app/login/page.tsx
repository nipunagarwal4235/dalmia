import {AuthForm} from '../../components/auth-form';
import {AuthShell} from '../../components/auth-shell';
import {safeAuthRedirect} from '../../lib/auth-redirect';
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string;error?:string}>}){const query=await searchParams;return <AuthShell><AuthForm next={safeAuthRedirect(query.next)} expired={query.error==='expired'}/></AuthShell>;}
