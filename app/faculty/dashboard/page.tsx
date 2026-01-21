"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  FileText, Hourglass, Trophy, Search, Trash2,
  CheckCircle2, AlertCircle, Plus, Pencil, Send, FolderOpen, ChevronRight
} from "lucide-react"
import {
  listenToFacultyDrafts,
  updateProject,
  deleteProject,
} from "@/lib/db/projects";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

interface Project {
  id: string;
  title: string;
  abstract: string;
  thumbnailUrl?: string;
  visibility: "public" | "pending" | "rejected" | "draft";
  students: any[];
  hodFeedback?: string;
  createdAt: any;
  updatedAt: any;
}

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

/* ===============================
   Confirmation Modal
   =============================== */
function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "drafts";

  const [tab, setTab] = useState<"drafts" | "pending" | "published" | "rejected">(initialTab);
  const [user, setUser] = useState<any>(null);

  const [drafts, setDrafts] = useState<Project[]>([]);
  const [pending, setPending] = useState<Project[]>([]);
  const [published, setPublished] = useState<Project[]>([]);
  const [rejected, setRejected] = useState<Project[]>([]);

  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [loadingRejected, setLoadingRejected] = useState(true);

  const [modal, setModal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PROJECTS_PER_PAGE = 9;

  // Handle Tab Change
  const handleTabChange = (newTab: string) => {
    setTab(newTab as any);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  /* ---------- Auth ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUser(user);
    });
    return () => unsub();
  }, [router]);

  /* ---------- Project Listeners ---------- */
  useEffect(() => {
    if (!user?.uid) return;

    // Drafts
    const unsubDrafts = listenToFacultyDrafts(user.uid, (items) => {
      setDrafts(items);
      setLoadingDrafts(false);
    });

    // Pending
    const qPending = query(
      collection(db, "projects"),
      where("facultyId", "==", user.uid),
      where("visibility", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const unsubPending = onSnapshot(qPending, (snap) => {
      setPending(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setLoadingPending(false);
    }, (error) => {
      if (error.code === "permission-denied") {
        if (auth.currentUser) {
          console.error("Faculty pending listener error:", error);
        }
        setPending([]);
        setLoadingPending(false);
      } else {
        console.error("Faculty pending listener error:", error);
      }
    });

    // Published
    const qPub = query(
      collection(db, "projects"),
      where("facultyId", "==", user.uid),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc")
    );
    const unsubPub = onSnapshot(qPub, (snap) => {
      setPublished(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setLoadingPublished(false);
    }, (error) => {
      if (error.code === "permission-denied") {
        if (auth.currentUser) {
          console.error("Faculty published listener error:", error);
        }
        setPublished([]);
        setLoadingPublished(false);
      } else {
        console.error("Faculty published listener error:", error);
      }
    });

    // Rejected
    const qRej = query(
      collection(db, "projects"),
      where("facultyId", "==", user.uid),
      where("visibility", "==", "rejected"),
      orderBy("createdAt", "desc")
    );
    const unsubRej = onSnapshot(qRej, (snap) => {
      setRejected(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setLoadingRejected(false);
    }, (error) => {
      if (error.code === "permission-denied") {
        if (auth.currentUser) {
          console.error("Faculty rejected listener error:", error);
        }
        setRejected([]);
        setLoadingRejected(false);
      } else {
        console.error("Faculty rejected listener error:", error);
      }
    });

    return () => {
      unsubDrafts();
      unsubPending();
      unsubPub();
      unsubRej();
    };
  }, [user?.uid]);

  /* ---------- Actions ---------- */
  function confirmAction(title: string, message: string, action: () => Promise<void>) {
    setModal({ title, message, action });
  }

  async function runAction() {
    if (!modal) return;
    setActionLoading(true);
    try {
      await modal.action();
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(false);
      setModal(null);
    }
  }

  /* ---------- Filter and Pagination Logic ---------- */
  function filterProjects(projects: Project[]) {
    return projects.filter(p =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  function paginateProjects(projects: Project[]) {
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    return projects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
  }

  const filteredDrafts = filterProjects(drafts);
  const filteredPending = filterProjects(pending);
  const filteredPublished = filterProjects(published);
  const filteredRejected = filterProjects(rejected);

  const paginatedDrafts = paginateProjects(filteredDrafts);
  const paginatedPending = paginateProjects(filteredPending);
  const paginatedPublished = paginateProjects(filteredPublished);
  const paginatedRejected = paginateProjects(filteredRejected);

  const totalPages = Math.ceil(
    (tab === "drafts" ? filteredDrafts :
      tab === "pending" ? filteredPending :
        tab === "rejected" ? filteredRejected :
          filteredPublished).length / PROJECTS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [tab, searchQuery]);

  /* ---------- UI Helpers ---------- */
  function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
    const colors: any = {
      blue: "bg-blue-50 text-blue-700 border-blue-100",
      orange: "bg-orange-50 text-orange-700 border-orange-100",
      green: "bg-green-50 text-green-700 border-green-100",
      red: "bg-red-50 text-red-700 border-red-100",
    };
    return (
      <div className={`p-4 rounded-xl border ${colors[color] || colors.blue} flex items-center justify-between`}>
        <div>
          <p className="text-xs font-bold uppercase text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-gray-400">
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 24 }) : icon}
        </div>
      </div>
    );
  }

  function ProjectCard({ p, children }: { p: Project; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-xl border border-blue-300 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
        <div className="p-6 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2 gap-2">
            <Link href={`/faculty/projects/${p.id}`} className="group/title flex-1">
              <h3 className="font-bold text-gray-900 group-hover/title:text-blue-600 transition-colors line-clamp-2 text-lg leading-tight">{p.title}</h3>
            </Link>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex-shrink-0 ${p.visibility === 'public' ? 'bg-green-100 text-green-700 border-green-200' :
                p.visibility === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  p.visibility === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                {p.visibility || 'Draft'}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{p.abstract}</p>
          <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
            <div className="flex -space-x-2">
              {p.students?.slice(0, 3).map((s: any, i: number) => (
                <div key={i} title={s.name} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                  {s.name?.charAt(0) || "S"}
                </div>
              ))}
              {p.students?.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                  +{p.students.length - 3}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function EmptyBox({ text }: { text: string }) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 px-8 text-center bg-gray-50">
        <FolderOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">{text}</p>
        <p className="text-sm text-gray-500 mt-1">Your project data will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        open={!!modal}
        title={modal?.title}
        message={modal?.message}
        loading={actionLoading}
        onConfirm={runAction}
        onCancel={() => setModal(null)}
      />

      <div className="min-h-screen bg-gray-50 pb-20 pt-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Faculty Dashboard</h1>
              <p className="text-gray-500 mt-1 font-medium">Manage your project submissions and track their status.</p>
            </div>
            <Link
              href={`/faculty/project-submission?tab=${tab}`}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow flex items-center gap-2 justify-center"
            >
              <Plus size={20} /> New Submission
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <StatCard label="Total Drafts" value={drafts.length} color="blue" icon={<FileText />} />
            <StatCard label="Pending" value={pending.length} color="orange" icon={<Hourglass />} />
            <StatCard label="Published" value={published.length} color="green" icon={<Trophy />} />
            <StatCard label="Rejected" value={rejected.length} color="red" icon={<AlertCircle />} />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 overflow-x-auto no-scrollbar">
            {[
              { id: "drafts", label: "Drafts", count: drafts.length },
              { id: "pending", label: "Pending", count: pending.length },
              { id: "published", label: "Published", count: published.length },
              { id: "rejected", label: "Rejected", count: rejected.length }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${tab === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
              >
                {t.label} ({t.count})
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

          <div className="min-h-[400px]">
            {tab === "drafts" && (
              loadingDrafts ? <div className="animate-pulse flex space-x-4">Loading...</div> :
                filteredDrafts.length === 0 ? <EmptyBox text="No drafts found" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedDrafts.map(p => (
                      <ProjectCard key={p.id} p={p}>
                        <div className="flex gap-2">
                          <Link
                            href={`/faculty/project-submission?edit=${p.id}&tab=drafts`}
                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            title="Edit Draft"
                          >
                            <Pencil size={18} />
                          </Link>
                          <button
                            onClick={() => confirmAction("Submit Project", "Submit this draft for HoD review?", async () => {
                              await updateProject(p.id, { visibility: "pending", updatedAt: new Date() });
                            })}
                            className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                            title="Submit for Review"
                          >
                            <Send size={18} />
                          </button>
                          <button
                            onClick={() => confirmAction("Delete Draft", "Are you sure? This cannot be undone.", async () => {
                              await deleteProject(p.id);
                            })}
                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                            title="Delete Draft"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </ProjectCard>
                    ))}
                  </div>
            )}

            {tab === "pending" && (
              loadingPending ? <div>Loading...</div> :
                filteredPending.length === 0 ? <EmptyBox text="No pending projects" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedPending.map(p => (
                      <ProjectCard key={p.id} p={p}>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-orange-500 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg">
                            <Hourglass size={14} /> Under Review
                          </span>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/faculty/project-submission?edit=${p.id}&tab=pending`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit Submission"
                            >
                              <Pencil size={16} />
                            </Link>
                            <Link href={`/faculty/projects/${p.id}`} className="text-blue-600 hover:underline text-xs font-bold flex items-center gap-1">
                              Review <ChevronRight size={12} />
                            </Link>
                          </div>
                        </div>
                      </ProjectCard>
                    ))}
                  </div>
            )}

            {tab === "published" && (
              loadingPublished ? <div>Loading...</div> :
                filteredPublished.length === 0 ? <EmptyBox text="No published projects" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedPublished.map(p => (
                      <ProjectCard key={p.id} p={p}>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 size={14} /> Published
                          </span>
                          <Link href={`/faculty/projects/${p.id}`} className="text-blue-600 hover:underline text-xs font-bold">View Details</Link>
                        </div>
                      </ProjectCard>
                    ))}
                  </div>
            )}

            {tab === "rejected" && (
              loadingRejected ? <div>Loading...</div> :
                filteredRejected.length === 0 ? <EmptyBox text="No projects rejected" /> :
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedRejected.map(p => (
                      <ProjectCard key={p.id} p={p}>
                        <div className="w-full space-y-4">
                          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">HoD Feedback</p>
                            <p className="text-sm text-red-600 italic line-clamp-3">&quot;{p.hodFeedback || "No feedback provided."}&quot;</p>
                          </div>
                          <Link
                            href={`/faculty/project-submission?edit=${p.id}&tab=rejected`}
                            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                          >
                            <Pencil size={18} /> Fix & Resubmit
                          </Link>
                        </div>
                      </ProjectCard>
                    ))}
                  </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-16">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-6 py-2 bg-white border border-gray-100 rounded-xl font-bold text-gray-600 disabled:opacity-30 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                Previous
              </button>
              <div className="flex items-center px-4 font-bold text-gray-400">
                Page <span className="text-gray-900 mx-1">{currentPage}</span> of {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-6 py-2 bg-white border border-gray-100 rounded-xl font-bold text-gray-600 disabled:opacity-30 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function FacultyDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
