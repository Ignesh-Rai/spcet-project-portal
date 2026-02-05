import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const initAdmin = () => {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        const envKeys = Object.keys(process.env);

        // Debug: Log available keys (safely)
        const firebaseRelatedKeys = envKeys.filter(k =>
            k.toUpperCase().includes("FIREBASE") ||
            k.toUpperCase().includes("SERVICE_ACCOUNT") ||
            k.toUpperCase().includes("GOOGLE")
        );
        console.log("Firebase related ENVs found:", firebaseRelatedKeys);

        // 1. Try exact match first (standard/recommended name)
        let serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;

        // 2. If not found, look for any key that might be the service account, 
        // but AVOID keys that are definitely just the public API key
        if (!serviceAccountVar) {
            const potentialKey = envKeys.find(k => {
                const upper = k.toUpperCase();
                // Check for SERVICE_ACCOUNT or FIREBASE_KEY as substrings
                const matchesSearch = upper.includes("SERVICE_ACCOUNT") || upper.includes("FIREBASE_KEY");
                // Exclude public API keys
                const isPublicKey = upper.includes("API_KEY") || upper.includes("NEXT_PUBLIC");

                return matchesSearch && !isPublicKey;
            });

            if (potentialKey) {
                console.log(`Found potential service account in ENV: ${potentialKey}`);
                serviceAccountVar = process.env[potentialKey];
            }
        }

        // 3. If we found a variable, try to use it
        if (serviceAccountVar) {
            try {
                const cleanJson = serviceAccountVar.trim();
                const serviceAccount = JSON.parse(cleanJson);

                // Basic validation: service account JSON must have a private_key
                if (serviceAccount && (serviceAccount.private_key || serviceAccount.privateKey)) {
                    return admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                    });
                } else {
                    console.warn("ENV service account found but lacks private_key. Falling back to file...");
                }
            } catch (parseError) {
                console.error("Failed to parse service account from ENV (likely not JSON). Falling back to file check...");
            }
        }

        // 4. Fallback to local file if ENV failed or wasn't found
        const localPaths = [
            path.join(process.cwd(), "serviceAccountKey.json"),
            path.join(process.cwd(), "service-account.json"),
            path.join(process.cwd(), "config", "serviceAccountKey.json")
        ];

        for (const filePath of localPaths) {
            if (fs.existsSync(filePath)) {
                console.log(`Using local file for Firebase Admin: ${filePath}`);
                const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
                return admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }
        }

        throw new Error(`No valid service account credentials found. Checked ENVs: [${firebaseRelatedKeys.join(", ")}] and local files.`);
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
