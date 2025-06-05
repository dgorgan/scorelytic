import { NextRequest } from 'next/server';

export async function handler(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.join('/') || '';
  const apiUrl = `https://api.scorelytic.com/demos/${slug}${req.nextUrl.search}`;
  const method = req.method;
  const headers = new Headers(req.headers);
  // Remove host header to avoid CORS/proxy issues
  headers.delete('host');

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: method !== 'GET' && method !== 'HEAD' ? await req.arrayBuffer() : undefined,
    redirect: 'manual',
  };

  const res = await fetch(apiUrl, fetchOptions);
  const responseHeaders = new Headers(res.headers);
  // Remove encoding headers that Next.js doesn't support
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new Response(await res.arrayBuffer(), {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
  handler as HEAD,
  handler as OPTIONS,
};
