"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getIdTokenResult, signOut, setPersistence, browserSessionPersistence, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, ShieldCheck, User, Users } from "lucide-react";
import { useEffect } from "react";

type Role = "faculty" | "hod" | "admin";

export default function UnifiedLogin() {
    const router = useRouter();
    const [role, setRole] = useState<Role>("faculty");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const idTokenResult = await user.getIdTokenResult();
                    const userRole = idTokenResult.claims.role as string;

                    if (userRole) {
                        // Refresh session cookie just in case
                        const token = await user.getIdToken();
                        await fetch("/api/auth/session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ token }),
                        });

                        router.replace(`/${userRole}/dashboard`);
                        return;
                    }
                } catch (err) {
                    console.error("Session check error:", err);
                }
            }
            setCheckingSession(false);
        });
        return () => unsub();
    }, [router]);

    if (checkingSession) {
        return (
            <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Set session persistence so closing tab logs out user
            await setPersistence(auth, browserSessionPersistence);

            const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
            const idTokenResult = await getIdTokenResult(cred.user, true);
            const claims = idTokenResult.claims || {};

            if (claims.role === role) {
                // Set session cookie via Server Action/API for reliability
                const token = await cred.user.getIdToken();

                await fetch("/api/auth/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                // Redirect based on role
                router.push(`/${role}/dashboard`);
            } else {
                await signOut(auth);
                setError(`❌ This account is not authorized as ${role.toUpperCase()}.`);
            }
        } catch (err: any) {
            setError("❌ Invalid credentials. Please check your email and password.");
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to PROJECT PORTAL</h1>
                    <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
                </div>

                {/* Role Tabs */}
                <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 mb-8">
                    {[
                        { id: "faculty", label: "Faculty", icon: Users },
                        { id: "hod", label: "HoD", icon: User },
                        { id: "admin", label: "Admin", icon: ShieldCheck }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setRole(tab.id as Role);
                                    setError("");
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all duration-200 ${role === tab.id
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="text-sm">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium animate-shake">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Enter Your Password"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 bottom-3.5 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-lg ${loading
                            ? "bg-blue-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200"
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Authenticating...</span>
                            </div>
                        ) : (
                            "Sign In"
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-sm font-semibold text-blue-600">
                            {role === "faculty" && "Manage your projects and submissions efficiently."}
                            {role === "hod" && "Review department projects and maintain academic standards."}
                            {role === "admin" && "Complete system control and analytical overview."}
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
