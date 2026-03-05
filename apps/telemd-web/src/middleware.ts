import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/demo",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/book/(.*)",
  "/onboarding(.*)",
  "/api/webhooks/(.*)",
]);

// Route role requirements
const isPatientRoute = createRouteMatcher(["/patient/(.*)"]);
const isClinicianRoute = createRouteMatcher(["/clinician/(.*)"]);
const isStaffRoute = createRouteMatcher(["/staff/(.*)"]);
const isOwnerRoute = createRouteMatcher(["/owner/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const role = (sessionClaims?.metadata as { role?: string })?.role;

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
