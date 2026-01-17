"use client";

import React, { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, BarChart3, FolderOpen, Clock, Search, ExternalLink } from "lucide-react";

interface Project {
    id: string;
    title: string;
    abstract: string;
    thumbnailUrl?: string;
    visibility: "public" | "pending" | "rejected" | "draft";
    department?: string;
    dept?: string;
    projectType?: string;
    technologies?: string[];
    students?: any[];
    hallOfFame?: boolean;
    year?: string | number;
    academicYear?: string;
    updatedAt?: any;
}

export default function AdminDashboard() {
    const router = useRouter();

    const [authChecked, setAuthChecked] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Search and Pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PROJECTS_PER_PAGE = 9;

    // Analytics State
    const [analytics, setAnalytics] = useState({
        totalProjects: 0,
        approvedCount: 0,
        hallOfFameCount: 0,
        projectsByDept: {} as Record<string, number>,
        projectsByType: {} as Record<string, number>,
        recentActivity: [] as Project[]
    });

    /* ===============================
       AUTH + ROLE PROTECTION (Admin)
       =============================== */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace("/admin/login");
                return;
            }

            const token = await user.getIdTokenResult();
            if (token.claims.role !== "admin") {
                alert("Access denied. Admin only.");
                router.replace("/");
                return;
            }

            setAuthChecked(true);
        });

        return () => unsub();
    }, [router]);

    /* ===============================
       Firestore Listener (Global)
       =============================== */
    useEffect(() => {
        if (!authChecked || !auth.currentUser) return;

        let q = query(
            collection(db, "projects"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            // Filter out rejected and draft projects
            const allItems = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            } as Project));

            const items = allItems.filter(p => p.visibility === 'public' || p.hallOfFame);

            setProjects(items);
            setLoading(false);

            // Update Analytics based on the filtered set
            const stats = {
                totalProjects: items.length,
                approvedCount: items.filter((p: any) => p.visibility === 'public').length,
                hallOfFameCount: items.filter((p: any) => p.hallOfFame).length,

                projectsByDept: items.reduce((acc: Record<string, number>, p: Project) => {
                    const dept = p.department || p.dept || 'Unknown'
                    acc[dept] = (acc[dept] || 0) + 1
                    return acc
                }, {}),

                projectsByType: items.reduce((acc: Record<string, number>, p: Project) => {
                    const type = p.projectType || 'Unknown'
                    acc[type] = (acc[type] || 0) + 1
                    return acc
                }, {}),

                recentActivity: items
                    .slice() // copy to sort
                    .sort((a: Project, b: Project) => {
                        const aTime = a.updatedAt?.toMillis?.() || 0
                        const bTime = b.updatedAt?.toMillis?.() || 0
                        return bTime - aTime
                    })
                    .slice(0, 5)
            }
            setAnalytics(stats)
        }, (error) => {
            if (error.code === "permission-denied") {
                if (auth.currentUser) {
                    console.error("Admin projects listener error:", error);
                }
                setProjects([]);
                setLoading(false);
            } else {
                console.error("Admin projects listener error:", error);
            }
        });

        return () => unsub();
    }, [authChecked, auth.currentUser]);

    /* ===============================
       Filter and Pagination Logic
       =============================== */
    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all"
            || (activeTab === "approved" && p.visibility === "public")
            || (activeTab === "hall-of-fame" && p.hallOfFame);
        return matchesSearch && matchesTab;
    });

    const paginatedProjects = filteredProjects.slice(
        (currentPage - 1) * PROJECTS_PER_PAGE,
        currentPage * PROJECTS_PER_PAGE
    );

    const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    if (!authChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Verifying Administrator Access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-blue-600" /> Admin Dashboard
                    </h1>
                    <p className="text-gray-600 mt-1">Overall Projects Insights & Analytics</p>
                </div>
            </div>

            {/* Analytics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <StatCard label="Total Published" value={analytics.totalProjects} color="blue" />
                <StatCard label="Approved" value={analytics.approvedCount} color="green" />
                <StatCard label="Hall of Fame" value={analytics.hallOfFameCount} color="purple" />
            </div>

            {/* Detailed Breakdown */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-500" /> By Department
                    </h3>
                    {Object.entries(analytics.projectsByDept).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(analytics.projectsByDept)
                                .sort(([, a], [, b]) => b - a)
                                .map(([dept, count]) => (
                                    <div key={dept} className="group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-700 font-medium">{dept}</span>
                                            <span className="font-bold text-blue-600">{count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all"
                                                style={{ width: `${(count / analytics.totalProjects) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No Departmental Data</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-gray-500" /> By Project Type
                    </h3>
                    {Object.entries(analytics.projectsByType).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(analytics.projectsByType)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, count]) => (
                                    <div key={type} className="group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-700 font-medium">{type}</span>
                                            <span className="font-bold text-blue-600">{count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all"
                                                style={{ width: `${(count / analytics.totalProjects) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No Project Type Data</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" /> Recent Activity
                    </h3>
                    {analytics.recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.recentActivity.map((p: any) => (
                                <div key={p.id} className="border-b pb-3 last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-800 line-clamp-1">{p.title || 'Untitled'}</p>
                                            <p className="text-xs text-gray-600">
                                                {p.department || p.dept || 'N/A'}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${p.hallOfFame ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                            {p.hallOfFame ? 'HALL OF FAME' : 'PUBLISHED'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-700 text-sm">No Recent Activity</p>
                    )}
                </div>
            </div>

            {/* Global Project Browser */}
            <div className="mb-6">
                <div className="flex gap-4 mb-6 overflow-x-auto no-scrollbar pb-2">
                    {[
                        { id: "all", label: "All Published" },
                        { id: "approved", label: "Approved" },
                        { id: "hall-of-fame", label: "Hall of Fame" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === tab.id
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="mb-8 flex gap-2 w-full">
                    <input
                        type="text"
                        placeholder="Global search across all departments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 bg-white shadow-sm"
                    />
                    <button className="bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-800 transition shadow-sm flex items-center justify-center">
                        <Search size={24} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FolderOpen className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-slate-800 font-bold text-lg">No Projects Found</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                            {searchQuery ? `We couldn't find any projects matching "${searchQuery}"` : "There are currently no projects in this category."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition"
                                >
                                    <h3 className="text-lg font-semibold mb-2 text-gray-900 line-clamp-2 min-h-[3.5rem]">
                                        {project.title}
                                    </h3>

                                    <p className="text-sm text-gray-700 mb-1">
                                        <strong>Type:</strong> {project.projectType || "N/A"}
                                    </p>

                                    <p className="text-sm text-gray-700 mb-1">
                                        <strong>Department:</strong> {project.department || project.dept || "N/A"}
                                    </p>

                                    <p className="text-sm text-gray-700 mb-3">
                                        <strong>Year:</strong> {project.year || project.academicYear || "—"}
                                    </p>

                                    <div className="flex justify-between items-center mb-4">
                                        <span
                                            className={`text-xs font-medium px-3 py-1 rounded-full ${project.visibility === "public"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-purple-100 text-purple-700"
                                                }`}
                                        >
                                            {project.visibility === "public" ? "PUBLISHED" : "HALL OF FAME"}
                                        </span>
                                    </div>

                                    <Link
                                        href={`/explorer/${project.id}`}
                                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 block text-center transition shadow-sm font-medium"
                                    >
                                        View Full Details
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-gray-700 font-medium">Page {currentPage} of {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-100 text-blue-700 border-blue-200",
        yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
        green: "bg-green-100 text-green-700 border-green-200",
        purple: "bg-purple-100 text-purple-700 border-purple-200"
    }

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color] || colorClasses.blue}`}>
            <p className="text-sm opacity-80 font-medium">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
    )
}
