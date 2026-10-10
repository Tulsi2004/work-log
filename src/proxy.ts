import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The manifest is fetched without the session cookie, so it has to be public or
// the phone never sees it and the site cannot be installed.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/manifest.webmanifest"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/(api|trpc)(.*)",
  ],
};
