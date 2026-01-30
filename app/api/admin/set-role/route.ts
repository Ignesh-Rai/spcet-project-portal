import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const initAdmin = () => {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        const envKeys = Object.keys(process.env);
        console.log("Available ENV keys:", envKeys.filter(k => k.includes("FIREBASE") || k.includes("SERVICE")));

        // Try exact match first
        let serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        // If not found, look for any key that might be the service account
        if (!serviceAccountVar) {
            const potentialKey = envKeys.find(k =>
                k.toUpperCase().includes("SERVICE_ACCOUNT") ||
                k.toUpperCase().includes("FIREBASE_KEY")
            );
            if (potentialKey) {
                console.log(`Found potential service account in ENV: ${potentialKey}`);
                serviceAccountVar = process.env[potentialKey];
            }
        }

        if (serviceAccountVar) {
            const cleanJson = serviceAccountVar.trim();
            const serviceAccount = JSON.parse(cleanJson);
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            const filePath = path.join(process.cwd(), "serviceAccountKey.json");
            if (fs.existsSync(filePath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
                return admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }
        }
        throw new Error(`No service account credentials found. Available related ENVs: ${envKeys.filter(k => k.includes("FIREBASE")).join(", ")}`);
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
