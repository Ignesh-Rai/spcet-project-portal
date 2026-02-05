import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const initAdmin = () => {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        const env = process.env;

        // 1. Try Individual Components (MOST RELIABLE)
        // We use NEXT_PUBLIC_FIREBASE_PROJECT_ID as a fallback for the Project ID
        const projectId = env.FIREBASE_ADMIN_PROJECT_ID || env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
        const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            console.log("Initializing Firebase Admin via Individual ENVs");
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        }

        // 2. Try JSON String
        const serviceAccountVar = env.FIREBASE_SERVICE_ACCOUNT_KEY || env.GOOGLE_APPLICATION_CREDENTIALS;
        if (serviceAccountVar) {
            try {
                const sa = JSON.parse(serviceAccountVar.trim());
                if (sa.private_key || sa.privateKey) {
                    console.log("Initializing Firebase Admin via JSON ENV");
                    return admin.initializeApp({
                        credential: admin.credential.cert(sa),
                    });
                }
            } catch (e) {
                console.error("JSON parse failed for service account variable");
            }
        }

        // 3. Last Resort: Local files (Works on Localhost)
        const possibleFiles = ["serviceAccountKey.json", "service-account.json", "config/serviceAccountKey.json"];
        for (const f of possibleFiles) {
            const fullPath = path.join(process.cwd(), f);
            if (fs.existsSync(fullPath)) {
                console.log(`Initializing Firebase Admin via Local File: ${f}`);
                const sa = JSON.parse(fs.readFileSync(fullPath, "utf8"));
                return admin.initializeApp({
                    credential: admin.credential.cert(sa),
                });
            }
        }

        // 4. Detailed Error for the UI
        const detected = Object.keys(env).filter(k => k.includes("FIREBASE") || k.includes("ADMIN"));
        throw new Error(`
            ❌ CREDENTIALS NOT LOADED.
            Checked for: FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL.
            Found in ENV: [${detected.join(", ")}]
            Local File Found: ${fs.existsSync(path.join(process.cwd(), "serviceAccountKey.json")) ? "YES" : "NO"}
            Please ensure you have REDEPLOYED in Vercel after adding variables.
        `);
    } catch (error: any) {
        console.error("Firebase Admin Error:", error.message);
        throw error;
    }
};

export async function POST(request: Request) {
    try {
        initAdmin();
        const { uid, role, department } = await request.json();

        if (!uid || !role) {
            return NextResponse.json({ error: "Missing UID or role" }, { status: 400 });
        }

        // Set custom claims
        const claims: any = { role };
        if (department) {
            claims.department = department;
        }

        await admin.auth().setCustomUserClaims(uid, claims);

        return NextResponse.json({ success: true, message: `Role ${role} assigned to ${uid}` });
    } catch (error: any) {
        console.error("Set role error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
