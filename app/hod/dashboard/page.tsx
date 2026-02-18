"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProject } from "@/lib/db/projects";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, BarChart3, FolderOpen, Clock, Search, UserPlus, Plus, X, Eye, EyeOff, Trash2, Key, Users, MenuIcon, UserCircle, FileText, ClipboardList } from "lucide-react";
import { createSecondaryUser } from "@/lib/admin-auth";
import NotificationModal from "@/components/ui/NotificationModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import InputModal from "@/components/ui/InputModal";

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
  createdAt?: any;
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
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "list">("create");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // UI Feedback State (Modals)
  const [notification, setNotification] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    open: false,
    title: "",
    message: "",
    type: "info"
  });
  const [confirmAction, setConfirmAction] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });
  const [inputModal, setInputModal] = useState<{ open: boolean; title: string; message: string; placeholder: string; type: string; onSubmit: (val: string) => void }>({
    open: false,
    title: "",
    message: "",
    placeholder: "",
    type: "text",
    onSubmit: () => { }
  });

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
        setNotification({
          open: true,
          title: "Access Denied",
          message: "You do not have the required permissions to access this dashboard.",
          type: "error"
        });
        router.replace("/");
        return;
      }

      // Extract department from claims
      const dept = token.claims.department as string;
      if (!dept) {
        setNotification({
          open: true,
          title: "Setup Incomplete",
          message: "Your department information is missing. Please contact the administrator.",
          type: "error"
        });
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

    // Use a simpler query and filter more precisely on the client
    // This avoids index issues, field naming issues, and missing field issues
    const q = query(collection(db, "projects"), where("visibility", "!=", "draft"));

    const unsub = onSnapshot(q, (snap) => {
      const allItems = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Project));

      const items = allItems.filter(p => {
        // Handle both 'dept' and 'department' fields
        const pDept = (p.department || p.dept || "").toString().toUpperCase().trim();
        const targetDept = userDept.toString().toUpperCase().trim();

        if (pDept !== targetDept) return false;

        // Tab specific filtering
        if (activeTab === "hall-of-fame") return p.hallOfFame === true;
        if (activeTab === "approved") return p.visibility === "public" && !p.hallOfFame;
        return p.visibility === "pending";
      }).sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setProjects(items);
      setLoading(false);
    }, (error) => {
      console.error("[HoD Dash] projects listener error:", error);
      if (error.code === 'permission-denied') {
        setNotification({
          open: true,
          title: "Session Expired",
          message: "Please logout and login again to refresh your session and permissions.",
          type: "error"
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [activeTab, authChecked, userDept]);

  /* ===============================
     Actions
     =============================== */
  async function approveProject(projectId: string) {
    if (!db) return;
    await updateProject(projectId, { visibility: "public", updatedAt: serverTimestamp() });
    setSelectedProject(null);
  }

  async function rejectProject(projectId: string) {
    if (!db) return;
    await updateProject(projectId, { visibility: "rejected", updatedAt: serverTimestamp() });
    setSelectedProject(null);
  }

  async function addToHallOfFame(projectId: string) {
    if (!db) return;
    await updateProject(projectId, { hallOfFame: true, updatedAt: serverTimestamp() });
    setSelectedProject(null);
  }

  /* ===============================
     Analytics Calculation (Filtered by HoD Dept)
     =============================== */
  useEffect(() => {
    if (!authChecked || !userDept || !auth.currentUser) return

    // Fetch all non-draft projects and filter in JS for total accuracy
    const q = query(collection(db, "projects"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allProjects = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Project))
          .filter(p => {
            const pDept = (p.department || p.dept || "").toUpperCase();
            return pDept === userDept.toUpperCase() && p.visibility !== 'draft';
          });

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

          recentActivity: [...allProjects]
            .filter(p => p.visibility !== 'rejected')
            .sort((a: Project, b: Project) => {
              const aTime = a.createdAt?.toMillis?.() || a.updatedAt?.toMillis?.() || 0
              const bTime = b.createdAt?.toMillis?.() || b.updatedAt?.toMillis?.() || 0
              return bTime - aTime
            })
            .slice(0, 5)
        }

        setAnalytics(stats)
      },
      (error) => {
        console.error("Analytics listener error:", error);
        if (error.code === 'permission-denied') {
          // Silently fail but log it, maybe don't alert twice if the other listener also alerts
          console.warn("Analytics permission denied - role might not be refreshed.");
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

  const fetchUsers = async () => {
    if (!userDept) return;
    setLoadingUsers(true);
    try {
      const resp = await fetch("/api/admin/users");
      const data = await resp.json();
      if (data.users) {
        // Filter: role is faculty AND department matches (case insensitive)
        setManagedUsers(data.users.filter((u: any) =>
          u.role === "faculty" &&
          u.department?.toUpperCase() === userDept.toUpperCase()
        ));
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showFacultyModal) fetchUsers();
  }, [showFacultyModal]);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFacultyCreationLoading(true);
    setFacultyMessage({ text: "", type: "" });

    const passwordToRecord = newFacultyPassword;

    try {
      if (!userDept) throw new Error("Department not found");

      // 1. Create User in Auth (Secondary App)
      const uid = await createSecondaryUser(newFacultyEmail, passwordToRecord);

      // 2. Set Custom Claims via API
      const response = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          role: "faculty",
          department: userDept,
          password: passwordToRecord // Recording password
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign role");
      }

      setFacultyMessage({ text: "✅ Faculty Account Created Successfully!", type: "success" });
      setNewFacultyEmail("");
      setNewFacultyPassword("");
      fetchUsers();
    } catch (error: any) {
      console.error("Faculty creation error:", error);
      setFacultyMessage({ text: "❌ " + (error.message || "Failed to create user"), type: "error" });
    } finally {
      setFacultyCreationLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    setConfirmAction({
      open: true,
      title: "Delete Faculty Account?",
      message: "Are you sure you want to delete this faculty account? This will permanently remove their access to the portal.",
      onConfirm: async () => {
        try {
          const resp = await fetch(`/api/admin/users?uid=${uid}`, { method: "DELETE" });
          if (resp.ok) {
            fetchUsers();
            setNotification({
              open: true,
              title: "Account Deleted",
              message: "The faculty account has been successfully removed.",
              type: "success"
            });
          }
        } catch (err) {
          console.error("Delete error:", err);
          setNotification({
            open: true,
            title: "Error",
            message: "Failed to delete the faculty account.",
            type: "error"
          });
        }
        setConfirmAction(prev => ({ ...prev, open: false }));
      }
    });
  };

  const togglePassword = (uid: string) => {
    setShowPasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleSetPassword = async (uid: string) => {
    setInputModal({
      open: true,
      title: "Update Password",
      message: "Set a new password for this faculty member. The changes will be synchronized instantly.",
      placeholder: "New password",
      type: "text",
      onSubmit: async (newPass) => {
        try {
          const resp = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid, password: newPass })
          });
          if (resp.ok) {
            setNotification({
              open: true,
              title: "Success",
              message: "Password updated and recorded accurately.",
              type: "success"
            });
            fetchUsers();
          }
        } catch (err) {
          console.error("Update password error:", err);
          setNotification({
            open: true,
            title: "Update Failed",
            message: "Something went wrong while updating the password.",
            type: "error"
          });
        }
        setInputModal(prev => ({ ...prev, open: false }));
      }
    });
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
            <MenuIcon size={18} />
            <span>Faculty Management</span>
          </button>

          <Link
            href="/hod/marks"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-md font-semibold"
            title="View and export departmental marks"
          >
            <ClipboardList size={18} />
            <span>View Marks</span>
          </Link>
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
      {showFacultyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setShowFacultyModal(false);
                setFacultyMessage({ text: "", type: "" });
              }}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>

            <div className="p-8 pb-0">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <UserCircle size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Faculty Management</h2>
                  <p className="text-sm text-gray-500">Manage faculty accounts for {userDept}</p>
                </div>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
                <button
                  onClick={() => setModalMode("create")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition ${modalMode === "create" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Plus size={16} /> Create New
                </button>
                <button
                  onClick={() => setModalMode("list")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition ${modalMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Users size={16} /> Existing Faculty ({managedUsers.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-0">
              {modalMode === "create" ? (
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
                        placeholder="Enter Password"
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
              ) : (
                <div className="space-y-4">
                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium text-gray-500">Loading faculty accounts...</p>
                    </div>
                  ) : managedUsers.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 font-medium">No faculty found in your department.</div>
                  ) : (
                    managedUsers.map((user) => (
                      <div key={user.uid} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{user.email}</p>
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">{user.department}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded-lg border border-gray-100">
                              <Key size={12} className="text-gray-400" />
                              <span>{showPasswords[user.uid] ? user.password : "••••••••"}</span>
                              <button
                                onClick={() => togglePassword(user.uid)}
                                className="text-blue-500 hover:text-blue-700 ml-1"
                              >
                                {showPasswords[user.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                            {user.isLegacy && (
                              <button
                                onClick={() => handleSetPassword(user.uid)}
                                className="text-[10px] text-orange-500 font-bold uppercase italic hover:underline"
                              >
                                Update Password
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Account"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }
      {/* Modals */}
      <NotificationModal
        open={notification.open}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      />

      <ConfirmModal
        open={confirmAction.open}
        title={confirmAction.title}
        message={confirmAction.message}
        onConfirm={confirmAction.onConfirm}
        onCancel={() => setConfirmAction(prev => ({ ...prev, open: false }))}
        danger={true}
      />

      <InputModal
        open={inputModal.open}
        title={inputModal.title}
        message={inputModal.message}
        placeholder={inputModal.placeholder}
        type={inputModal.type}
        onSubmit={inputModal.onSubmit}
        onCancel={() => setInputModal(prev => ({ ...prev, open: false }))}
      />
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
