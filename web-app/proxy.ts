import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

export async function proxy(request:NextRequest) {
  let response = NextResponse.next({request});
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        values.forEach(({name,value,options}) => response.cookies.set(name,value,options));
      },
    },
  });
  const {data, error} = await client.auth.getUser();
  const publicPaths = ['/login', '/signup', '/forgot-password', '/privacy', '/auth/callback', '/auth/mobile', '/view3d'];
  if (!publicPaths.includes(request.nextUrl.pathname) && (error || !data.user)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  }
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config = {matcher:['/((?!_next/static/|favicon\\.ico$|assets/(?:favicon|dalmia-monogram|dalmia-wordmark)\\.svg$|models/[a-z0-9-]+\\.glb$).*)']};
