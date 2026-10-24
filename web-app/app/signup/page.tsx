import {AuthForm} from '../../components/auth-form';
import {AuthShell} from '../../components/auth-shell';
import {safeAuthRedirect} from '../../lib/auth-redirect';
export default async function SignupPage({searchParams}:{searchParams:Promise<{next?:string}>}){const query=await searchParams;return <AuthShell><AuthForm mode="signup" next={safeAuthRedirect(query.next)}/></AuthShell>;}
