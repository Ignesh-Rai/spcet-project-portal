import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

const initAdmin = () => {
    if (admin.apps.length > 0) return admin.apps[0];

    try {
        const env = process.env;
        const projectId = env.FIREBASE_ADMIN_PROJECT_ID || env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
        const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
            });
        }

        // Try fallback to local file if available (mostly for local development)
        const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (saPath) {
            return admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        }

        throw new Error("Credentials not found");
    } catch (error: any) {
        console.error("Firebase Admin Error:", error.message);
        throw error;
    }
};

export async function GET() {
    try {
        initAdmin();
        const listUsersResult = await admin.auth().listUsers();

        // Get all recorded credentials from Firestore
        const db = admin.firestore();
        const credentialsSnap = await db.collection("user_credentials").get();
        const credentialsMap: Record<string, string> = {};
        credentialsSnap.forEach(doc => {
            credentialsMap[doc.id] = doc.data().password;
        });

        const users = listUsersResult.users.map((userRecord) => {
            const role = userRecord.customClaims?.role || "user";
            const department = userRecord.customClaims?.department || "N/A";

            return {
                uid: userRecord.uid,
                email: userRecord.email,
                role: role,
                department: department,
                password: credentialsMap[userRecord.uid] || "********", // Show password if we have it recorded
                isLegacy: !credentialsMap[userRecord.uid]
            };
        });

        return NextResponse.json({ users });
    } catch (error: any) {
        console.error("List users error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        initAdmin();
        const { uid, password } = await request.json();

        if (!uid || !password) {
            return NextResponse.json({ error: "Missing UID or password" }, { status: 400 });
        }

        // Update in Firebase Auth
        await admin.auth().updateUser(uid, { password });

        // Update/Record in Firestore
        const db = admin.firestore();
        await db.collection("user_credentials").doc(uid).set({
            password: password,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
        console.error("Update password error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        initAdmin();
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json({ error: "Missing UID" }, { status: 400 });
        }

        await admin.auth().deleteUser(uid);

        // Remove from Firestore records
        const db = admin.firestore();
        await db.collection("user_credentials").doc(uid).delete();

        return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
