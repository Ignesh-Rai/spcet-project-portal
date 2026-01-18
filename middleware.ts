import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Protect /faculty routes
    if (pathname.startsWith("/faculty")) {
        // Allow access to direct assets
        if (pathname === "/faculty/login") {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Check for session cookie
        const session = request.cookies.get("__session");
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // 2. Protect /hod routes
    if (pathname.startsWith("/hod")) {
        if (pathname === "/hod/login") {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        const session = request.cookies.get("__session");
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // 3. Protect /admin routes
    if (pathname.startsWith("/admin")) {
        if (pathname === "/admin/login") {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        const session = request.cookies.get("__session");
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
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
