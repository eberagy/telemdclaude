import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  "/api/health",
  "/api/webhooks/(.*)",
  "/api/availability(.*)",       // booking flow: guests check slots
  "/api/onboarding/(.*)",        // practice creation (newly signed-up owner)
  "/api/demo-request",           // public lead capture form
  "/api/practices/(.*)",         // booking flow: public practice + appointment type info
  "/api/invites/(.*)",           // GET invite preview (public), POST requires auth (handled inline)
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
