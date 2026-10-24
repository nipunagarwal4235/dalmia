export function safeAuthRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://dalmia.invalid');
    if (url.origin !== 'https://dalmia.invalid' || ['/login', '/signup', '/forgot-password'].includes(url.pathname) || url.pathname.startsWith('/auth/')) return '/';
    return url.pathname + url.search;
  } catch { return '/'; }
}
