import {requireAccount} from '../../../lib/supabase/access';
import {AuthForm} from '../../../components/auth-form';
export default async function PasswordPage(){await requireAccount();return <AuthForm recovery/>;}
