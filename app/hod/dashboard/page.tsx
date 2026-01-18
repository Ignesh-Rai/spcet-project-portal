"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProject } from "@/lib/db/projects";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, BarChart3, FolderOpen, Clock, Search, UserPlus, Plus, X } from "lucide-react";
import { createSecondaryUser } from "@/lib/admin-auth";

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

export default function HoDDashboard() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFacultyModal, setShowFacultyModal] = useState(false);

  // Faculty Management State
  const [newFacultyEmail, setNewFacultyEmail] = useState("");
  const [newFacultyPassword, setNewFacultyPassword] = useState("");
  const [facultyCreationLoading, setFacultyCreationLoading] = useState(false);
  const [facultyMessage, setFacultyMessage] = useState({ text: "", type: "" });

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 9;

  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalProjects: 0,
    pendingCount: 0,
    approvedCount: 0,
    hallOfFameCount: 0,
    projectsByType: {} as Record<string, number>,
    recentActivity: [] as Project[]
  });

  /* ===============================
     AUTH + ROLE PROTECTION (HoD)
     =============================== */
  const [userDept, setUserDept] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const token = await user.getIdTokenResult();
      if (token.claims.role !== "hod") {
        alert("Access denied. HoD only.");
        router.replace("/");
        return;
      }

      // Extract department from claims
      const dept = token.claims.department as string;
      if (!dept) {
        alert("System Error: Department not assigned to this HoD account.");
        router.replace("/");
        return;
      }

      setUserDept(dept);
      setAuthChecked(true);
    });

    return () => unsub();
  }, [router]);

  /* ===============================
     Firestore Listener (HoD - Filtered by Dept)
     =============================== */
  useEffect(() => {
    if (!authChecked || !userDept || !auth.currentUser) return;

    let q;
    // ... (rest of query logic)

    if (activeTab === "hall-of-fame") {
      q = query(
        collection(db, "projects"),
        where("department", "==", userDept),
        where("hallOfFame", "==", true),
        orderBy("createdAt", "desc")
      );
    } else if (activeTab === "approved") {
      q = query(
        collection(db, "projects"),
        where("department", "==", userDept),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "projects"),
        where("department", "==", userDept),
        where("visibility", "==", "pending"),
        orderBy("createdAt", "desc")
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      let items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Project));

      // Filter out Hall of Fame from Approved list if activeTab is approved
      if (activeTab === "approved") {
        items = items.filter(p => !p.hallOfFame);
      }

      setProjects(items);
      setLoading(false);
    }, (error) => {
      if (error.code === "permission-denied") {
        if (auth.currentUser) {
          console.error("HoD projects listener error:", error);
        }
        setProjects([]);
        setLoading(false);
      } else {
        console.error("HoD projects listener error:", error);
      }
    });

    return () => unsub();
  }, [activeTab, authChecked, userDept]);

  /* ===============================
     Actions
     =============================== */
  async function approveProject(projectId: string) {
    await updateProject(projectId, { visibility: "public" });
    setSelectedProject(null);
  }

  async function rejectProject(projectId: string) {
    await updateProject(projectId, { visibility: "rejected" });
    setSelectedProject(null);
  }

  async function addToHallOfFame(projectId: string) {
    await updateProject(projectId, { hallOfFame: true });
    setSelectedProject(null);
  }

  /* ===============================
     Analytics Calculation (Filtered by HoD Dept)
     =============================== */
  useEffect(() => {
    if (!authChecked || !userDept || !auth.currentUser) return

    const q = query(
      collection(db, "projects"),
      where("department", "==", userDept)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allProjects = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Project))
          .filter(p => p.visibility !== 'draft');

        const stats = {
          totalProjects: allProjects.length,
          pendingCount: allProjects.filter((p: any) => p.visibility === 'pending').length,
          approvedCount: allProjects.filter((p: any) => p.visibility === 'public' && !p.hallOfFame).length,
          hallOfFameCount: allProjects.filter((p: any) => p.hallOfFame).length,

          projectsByType: allProjects.reduce((acc: Record<string, number>, p: Project) => {
            const type = p.projectType || 'Unknown'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {}),

          recentActivity: allProjects
            .filter(p => p.visibility !== 'rejected' && p.visibility !== 'draft')
            .sort((a: Project, b: Project) => {
              const aTime = a.updatedAt?.toMillis?.() || 0
              const bTime = b.updatedAt?.toMillis?.() || 0
              return bTime - aTime
            })
            .slice(0, 5)
        }

        setAnalytics(stats)
      },
      (error) => {
        if (error.code === "permission-denied") {
          if (auth.currentUser) {
            console.error("Analytics listener error:", error);
          }
          setAnalytics({
            totalProjects: 0,
            pendingCount: 0,
            approvedCount: 0,
            hallOfFameCount: 0,
            projectsByType: {},
            recentActivity: []
          });
        } else {
          console.error("Analytics listener error:", error);
        }
      }
    )

    return () => unsubscribe()
  }, [authChecked, userDept, auth.currentUser])

  /* ===============================
     Filter and Pagination Logic
     =============================== */
  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);

  // Reset to page 1 when changing tabs or search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFacultyCreationLoading(true);
    setFacultyMessage({ text: "", type: "" });

    try {
      if (!userDept) throw new Error("Department not found");

      // 1. Create User in Auth (Secondary App)
      const uid = await createSecondaryUser(newFacultyEmail, newFacultyPassword);

      // 2. Set Custom Claims via API
      const response = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role: "faculty", department: userDept }),
      });

      if (!response.ok) throw new Error("Failed to assign role");

      setFacultyMessage({ text: "✅ Faculty Account Created Successfully!", type: "success" });
      setNewFacultyEmail("");
      setNewFacultyPassword("");
    } catch (error: any) {
      console.error("Faculty creation error:", error);
      setFacultyMessage({ text: "❌ " + (error.message || "Failed to create user"), type: "error" });
    } finally {
      setFacultyCreationLoading(false);
    }
  };

  /* ===============================
     AUTH LOADING GATE
     =============================== */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking access...</p>
      </div>
    );
  }

  /* ===============================
     UI
     =============================== */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" /> HoD Dashboard {userDept && `(${userDept})`}
          </h1>
          <p className="text-gray-600 mt-1">Project oversight and management for {userDept || 'your'} department</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFacultyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition shadow-sm font-semibold"
          >
            <UserPlus size={18} />
            <span>Faculty Management</span>
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Projects" value={analytics.totalProjects} color="blue" />
        <StatCard label="Pending" value={analytics.pendingCount} color="yellow" />
        <StatCard label="Approved" value={analytics.approvedCount} color="green" />
        <StatCard label="Hall of Fame" value={analytics.hallOfFameCount} color="purple" />
      </div>

      {/* Type Breakdown & Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-500" /> Projects by Type
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
            <p className="text-gray-500 text-sm">No Data Available</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" /> Recently Published
          </h3>
          {analytics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.map((p: any) => (
                <div key={p.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{p.title || 'Untitled'}</p>
                      <p className="text-sm text-gray-600">
                        {p.projectType || 'N/A'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.visibility === 'public' ? 'bg-green-100 text-green-700' :
                      p.visibility === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                      {p.visibility?.toUpperCase() || 'DRAFT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-700 text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: "pending", label: "Pending" },
          { id: "approved", label: "Approved" },
          { id: "hall-of-fame", label: "Hall Of Fame" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition ${activeTab === tab.id
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
          placeholder="Search by project title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 bg-white shadow-sm"
        />
        <button className="bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-800 transition shadow-sm flex items-center justify-center">
          <Search size={24} />
        </button>
      </div>

      {/* Project List */}
      {
        loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
            {searchQuery ? `No projects match "${searchQuery}"` : "No projects found."}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition"
                >
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 line-clamp-1">
                    {project.title}
                  </h3>

                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Type:</strong> {project.projectType || "N/A"}
                  </p>

                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Department:</strong> {project.dept || project.department || "N/A"}
                  </p>

                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Year:</strong> {project.year || project.academicYear || "—"}
                  </p>

                  <span
                    className={`inline-block text-xs font-medium px-3 py-1 rounded-full mb-3 ${project.visibility === "public"
                      ? "bg-green-100 text-green-700"
                      : project.visibility === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : project.visibility === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                  >
                    {project.visibility?.toUpperCase()}
                  </span>

                  <Link
                    href={`/hod/projects/${project.id}`}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 block text-center transition shadow-sm"
                  >
                    Review Project
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
                <span className="px-4 py-2 text-gray-700">Page {currentPage} of {totalPages}</span>
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
        )
      }

      {/* Faculty Management Modal */}
      {
        showFacultyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => {
                  setShowFacultyModal(false);
                  setFacultyMessage({ text: "", type: "" });
                }}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Faculty Management</h2>
                  <p className="text-sm text-gray-500">Create new faculty account for {userDept}</p>
                </div>
              </div>

              <form onSubmit={handleCreateFaculty} className="space-y-6">
                {facultyMessage.text && (
                  <div className={`p-4 rounded-xl text-sm font-medium ${facultyMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                    {facultyMessage.text}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email ID</label>
                    <input
                      type="email"
                      required
                      placeholder="faculty@example.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                      value={newFacultyEmail}
                      onChange={(e) => setNewFacultyEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Temporary Password"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                      value={newFacultyPassword}
                      onChange={(e) => setNewFacultyPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={facultyCreationLoading}
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-lg ${facultyCreationLoading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200"
                    } flex items-center justify-center gap-2`}
                >
                  {facultyCreationLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      <span>Create Faculty Account</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}

/* ===============================
   Helper Component: StatCard
   =============================== */
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200"
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-sm opacity-80 font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
