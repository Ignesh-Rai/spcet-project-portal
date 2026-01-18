import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Redirect legacy login paths
    if (pathname === "/faculty/login" || pathname === "/hod/login" || pathname === "/admin/login") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. /_vercel (Vercel internals)
         * 5. static files (e.g. favicon.ico, sitemap.xml)
         */
        "/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)",
    ],
};
