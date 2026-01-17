"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);

            // Verify role after login
            const tokenResult = await auth.currentUser?.getIdTokenResult();
            if (tokenResult?.claims?.role !== "admin") {
                setError("Access denied. Not an Admin account.");
                return;
            }

            // ✅ SET COOKIE for Middleware
            const token = await auth.currentUser?.getIdToken();
            document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax`;

            router.push("/admin/dashboard");
        } catch (err) {
            setError("Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100">

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <Image
                        src="/College-logo.png"
                        alt="SPCET Logo"
                        width={100}
                        height={100}
                        className="drop-shadow-sm"
                    />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Admin Portal
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm uppercase tracking-wider font-semibold">Overall Project Insight & Management</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="admin-email" className="text-xs font-bold text-gray-600 uppercase tracking-tight ml-1">Admin Email</label>
                        <input
                            id="admin-email"
                            type="email"
                            placeholder="Enter Mail Id"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 font-medium"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="admin-password" className="text-xs font-bold text-gray-600 uppercase tracking-tight ml-1">Password</label>
                        <div className="relative">
                            <input
                                id="admin-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 font-medium pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs font-medium text-center bg-red-50 py-2 rounded-lg border border-red-100">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-60 mt-2"
                    >
                        {loading ? "Authenticating..." : "Sign In to Dashboard"}
                    </button>
                </form>

                <p className="text-center mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Secure Administrator Access Only
                </p>
            </div>
        </div>
    );
}
