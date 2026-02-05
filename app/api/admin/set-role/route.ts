import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const initAdmin = () => {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        const env = process.env;

        // 1. Try Individual Components (MOST RELIABLE - Recommended for Vercel/Production)
        if (env.FIREBASE_ADMIN_PROJECT_ID && env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
            console.log("Initializing Firebase Admin using individual components");
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
                    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
                    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
        }

        // 2. Try JSON String (Original fallback)
        let serviceAccountVar = env.FIREBASE_SERVICE_ACCOUNT_KEY || env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!serviceAccountVar) {
            const envKeys = Object.keys(env);
            const potentialKey = envKeys.find(k => {
                const upper = k.toUpperCase();
                return (upper.includes("SERVICE_ACCOUNT") || upper.includes("FIREBASE_KEY")) &&
                    !upper.includes("API_KEY") && !upper.includes("NEXT_PUBLIC");
            });

            if (potentialKey) {
                console.log(`Found potential service account in ENV: ${potentialKey}`);
                serviceAccountVar = env[potentialKey];
            }
        }

        if (serviceAccountVar) {
            try {
                const serviceAccount = JSON.parse(serviceAccountVar.trim());
                if (serviceAccount && (serviceAccount.private_key || serviceAccount.privateKey)) {
                    return admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                }
            } catch (e) {
                console.error("JSON parse failed, checking individual fallbacks...");
            }
        }

        // 3. Last Resort: Local files
        const localPaths = [
            path.join(process.cwd(), "serviceAccountKey.json"),
            path.join(process.cwd(), "service-account.json")
        ];

        for (const filePath of localPaths) {
            if (fs.existsSync(filePath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
                return admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }
        }

        // If we reach here, tell the user Exactly what is missing
        const foundKeys = Object.keys(env).filter(k => k.includes("FIREBASE") || k.includes("ADMIN"));
        throw new Error(`MISSING CREDENTIALS. Please add FIREBASE_ADMIN_PROJECT_ID, CLIENT_EMAIL, and PRIVATE_KEY to Vercel. (Detected: [${foundKeys.join(", ")}])`);
    } catch (error: any) {
        console.error("Firebase Admin initialization error:", error);
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
