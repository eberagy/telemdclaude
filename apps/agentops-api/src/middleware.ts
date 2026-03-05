import { NextRequest, NextResponse } from "next/server";

// Routes accessible without auth
const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/webhooks/",
  "/api/approvals/",  // token-authenticated approval actions
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const secret = process.env.AGENTOPS_ADMIN_SECRET;
  if (!secret) {
    // Dev mode: warn but allow
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Accept secret via Authorization header or X-Admin-Secret header
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-admin-secret");

  const provided =
    secretHeader ??
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
