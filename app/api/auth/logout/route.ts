import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();

        // Delete the session cookie
        cookieStore.delete("__session");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Session delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
