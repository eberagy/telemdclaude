/**
 * Server-side proxy: agentops-ui /api/* → agentops-api /api/*
 * Injects AGENTOPS_ADMIN_SECRET so browser code never holds the secret.
 */
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_AGENTOPS_API_URL ?? "http://localhost:4000";
const ADMIN_SECRET = process.env.AGENTOPS_ADMIN_SECRET ?? "";

async function proxy(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = segments.join("/");
  const search = req.nextUrl.search;
  const upstream = `${API_BASE}/api/${path}${search}`;

  const headers = new Headers(req.headers);
  headers.set("x-admin-secret", ADMIN_SECRET);
  // Don't forward the host header — breaks routing
  headers.delete("host");

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(upstream, {
      method: req.method,
      headers,
      body,
    });
    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    console.error("[proxy]", err);
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }) {
  const { proxy: segments } = await params;
  return proxy(req, segments);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }) {
  const { proxy: segments } = await params;
  return proxy(req, segments);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }) {
  const { proxy: segments } = await params;
  return proxy(req, segments);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }) {
  const { proxy: segments } = await params;
  return proxy(req, segments);
}
