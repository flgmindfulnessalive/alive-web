// Origen: MASSIVE CO. Sirve la página «Próximamente» cuando la visita entra por massiveco.shop.
// Corre antes de los archivos estáticos (una reescritura de vercel.json no alcanza a «/», que ya existe).
// En cualquier otro dominio no hace nada.
export const config = { matcher: '/((?!massiveco-proximamente/).*)' };

const HOSTS = new Set(['massiveco.shop']);
const BASE = '/massiveco-proximamente';

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  if (!HOSTS.has(url.hostname)) return new Response(null, { headers: { 'x-middleware-next': '1' } });
  url.pathname = BASE + (url.pathname === '/' ? '/index.html' : url.pathname);
  return new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });
}
