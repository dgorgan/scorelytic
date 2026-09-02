import { NextRequest } from 'next/server';

// Backend that serves the static demo sites (server/demos, via Express).
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://scorelytic-api.onrender.com').replace(
  /\/$/,
  '',
);

export async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug: slugSegments } = await params;
  const slug = slugSegments?.join('/') || '';
  const apiUrl = `${API_URL}/demos/${slug}${req.nextUrl.search}`;
  const method = req.method;
  const headers = new Headers(req.headers);
  // Remove host header to avoid CORS/proxy issues
  headers.delete('host');
  // Ask upstream for an uncompressed body, since we strip content-encoding below
  headers.delete('accept-encoding');

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
  responseHeaders.delete('content-length');

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
