import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        // Set the session cookie
        // HttpOnly: true -> stricter security, not accessible by client JS (good for middleware)
        // Secure: true -> https only
        // SameSite: lax -> required for navigation
        // Max-Age header omitted -> Session Cookie (cleared on browser close)

        // Note: We need to await cookies() in Next.js 15, but in 14 it's synchronous. 
        // Assuming Next.js 14 based on previous context, but await is safe.
        const cookieStore = await cookies();

        cookieStore.set("__session", token, {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Session set error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
