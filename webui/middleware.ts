import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 首访按 Accept-Language 分流（/en 英文，其余中文）；显式路径优先，cookie 记住选择
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  if (pathname === '/en') {
    res.cookies.set('bl', 'en', { path: '/', maxAge: 31536000 });
    return res;
  }
  if (pathname !== '/') return res;
  if (req.cookies.has('bl')) return res;

  const al = req.headers.get('accept-language') ?? '';
  if (al.toLowerCase().startsWith('en')) {
    const url = req.nextUrl.clone();
    url.pathname = '/en';
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set('bl', 'en', { path: '/', maxAge: 31536000 });
    return redirect;
  }
  res.cookies.set('bl', 'zh', { path: '/', maxAge: 31536000 });
  return res;
}

export const config = {
  matcher: ['/', '/en'],
};
