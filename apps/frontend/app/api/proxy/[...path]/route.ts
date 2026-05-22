import { NextRequest } from "next/server";

function buildBackendUrl(pathSegments: string[], search: string): string {
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/v1";
  const normalizedBase = backendBaseUrl.replace(/\/+$/, "");
  const normalizedPath = pathSegments
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBase}/${normalizedPath}${search}`;
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<Response> {
  const backendUrl = buildBackendUrl(pathSegments, request.nextUrl.search);
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  const headers = new Headers();

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  // Avoid compressed upstream payloads that can break when re-streamed through Next route handlers.
  headers.set("accept-encoding", "identity");

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const rawBody = await request.text();
    body = rawBody.length > 0 ? rawBody : undefined;
  }

  const response = await fetch(backendUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");

  const responseBody = await response.arrayBuffer();

  return new Response(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params;
  return proxyRequest(request, params.path || []);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params;
  return proxyRequest(request, params.path || []);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params;
  return proxyRequest(request, params.path || []);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params;
  return proxyRequest(request, params.path || []);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const params = await context.params;
  return proxyRequest(request, params.path || []);
}
