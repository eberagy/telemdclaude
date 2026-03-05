import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/demo",
  "/terms",
  "/privacy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/book/(.*)",
  "/onboarding(.*)",
  "/invites/(.*)",
  "/api/webhooks/(.*)",
]);

const ROLE_HOME: Record<string, string> = {
  Patient: "/patient/appointments",
  Clinician: "/clinician/schedule",
  Staff: "/staff/schedule",
  PracticeOwner: "/owner/billing",
  PlatformAdmin: "/owner/billing",
};

// Route role requirements
const isPatientRoute = createRouteMatcher(["/patient/(.*)"]);
const isClinicianRoute = createRouteMatcher(["/clinician/(.*)"]);
const isStaffRoute = createRouteMatcher(["/staff/(.*)"]);
const isOwnerRoute = createRouteMatcher(["/owner/(.*)"]);

const isLandingRoute = createRouteMatcher(["/", "/pricing", "/demo"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Redirect authenticated users away from landing/marketing to their portal
  if (userId && role && isLandingRoute(req)) {
    const home = ROLE_HOME[role] ?? "/";
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (isPublicRoute(req)) return;

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // New users without a role → send to onboarding
  if (!role) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Role-based route guards
  if (isPatientRoute(req) && role !== "Patient" && role !== "PlatformAdmin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (
    isClinicianRoute(req) &&
    role !== "Clinician" &&
    role !== "PlatformAdmin"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (
    isStaffRoute(req) &&
    role !== "Staff" &&
    role !== "PracticeOwner" &&
    role !== "PlatformAdmin"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (
    isOwnerRoute(req) &&
    role !== "PracticeOwner" &&
    role !== "PlatformAdmin"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
