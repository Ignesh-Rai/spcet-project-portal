import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Creates a new user without logging out the current user.
 * This works by initializing a secondary Firebase app instance.
 */
export async function createSecondaryUser(email: string, password: string) {
    const secondaryAppName = `SecondaryApp_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        // After creation, we MUST sign out of the secondary auth to prevent session conflicts
        await signOut(secondaryAuth);

        // Cleanup: delete the secondary app instance
        await deleteApp(secondaryApp);

        return uid;
    } catch (error) {
        // Attempt cleanup even on failure
        try {
            await deleteApp(secondaryApp);
        } catch (e) { }
        throw error;
    }
}
