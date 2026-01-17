"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  FileText,
  User,
  Calendar,
  Layout,
  Trophy,
  AlertCircle,
  FlaskConical
} from "lucide-react";

/**
 * ProjectDetailPage
 * - Real-time listener on projects/{id}
 * - Premium UI Design
 */

type Student = {
  name: string;
  regNo?: string;
  dept?: string;
  year?: string;
  email?: string;
  phone?: string
};

type ProjectDoc = {
  id: string;
  title?: string;
  abstract?: string;
  technologies?: string[];
  students?: Student[];
  thumbnailUrl?: string;
  screenshotUrls?: string[];
  reportUrl?: string;
  githubLink?: string;
  demoLink?: string;
  createdAt?: any;
  hallOfFame?: boolean;
  visibility?: string;
  dept?: string;
  department?: string;
  projectType?: string;
  academicYear?: string;
  publicationTitle?: string;
  publicationType?: string;
  journalName?: string;
  paperLink?: string;
};

export default function ProjectDetailPage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const id = params?.id;

  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [canViewReport, setCanViewReport] = useState(false);

  // Role Check Logic
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await getIdTokenResult(user, true);
        const role = token.claims.role;
        setCanViewReport(role === "admin" || role === "faculty" || role === "hod");
      } else {
        setCanViewReport(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id || !db) return;

    const docRef = doc(db, "projects", id);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snap.data() as ProjectDoc;

        // Block private projects
        if (data.visibility && data.visibility !== "public") {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProject({
          ...data,
          id: snap.id,
          title: data.title ?? "Untitled Project",
          abstract: data.abstract ?? "",
          technologies: Array.isArray(data.technologies) ? data.technologies : [],
          students: Array.isArray(data.students) ? data.students : [],
          screenshotUrls: Array.isArray(data.screenshotUrls) ? data.screenshotUrls : [],
        });
        setNotFound(false);
        setLoading(false);
      },
      (err) => {
        if (err.code === "permission-denied") {
          // If we was redirected from a private project to home on logout, silence this
        } else {
          console.error("Project snapshot error:", err);
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Project Not Found</h1>
        <Link href="/explorer" className="mt-4 text-blue-600 flex items-center gap-2 hover:underline">
          <ArrowLeft size={20} /> Back to Explorer
        </Link>
      </div>
    );
  }

  const projectDept = project.dept || project.department || "Unknown Department";
  const displayYear = project.academicYear || (project.createdAt?.toDate ? project.createdAt.toDate().getFullYear() : "N/A");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 pt-4">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{project.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded uppercase">{projectDept}</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{project.projectType || 'Project'}</span>
              </div>
            </div>
          </div>
          {project.hallOfFame && (
            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
              <Trophy size={16} className="text-yellow-600" />
              <span className="text-xs font-bold text-yellow-700 uppercase tracking-tight">Hall of Fame</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Project Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Content Card */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="w-full bg-gray-50 flex items-center justify-center">
              {project.thumbnailUrl ? (
                <img
                  src={project.thumbnailUrl}
                  className="w-full h-auto object-contain block"
                  alt={project.title}
                />
              ) : (
                <div className="w-full h-[300px] flex flex-col items-center justify-center text-gray-400">
                  <Layout size={48} />
                  <p className="mt-2 text-sm font-medium">No thumbnail available</p>
                </div>
              )}
            </div>

            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="text-blue-600" size={20} />
                <h2 className="text-xl font-bold text-gray-900">Project Overview</h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {project.technologies?.map((tech, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-sm font-bold border border-gray-200">
                    {tech}
                  </span>
                ))}
              </div>

              <div className="prose max-w-none text-gray-800 leading-relaxed mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Abstract</h3>
                <p className="whitespace-pre-wrap">{project.abstract}</p>
              </div>

              {/* Resources & Links */}
              <div className="pt-8 border-t border-gray-100 grid md:grid-cols-2 gap-4">
                {project.githubLink && (
                  <a href={project.githubLink} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all group">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-gray-900 shadow-sm group-hover:scale-110 transition-transform">
                      <Github size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Source Code</p>
                      <p className="text-xs text-blue-600 font-medium">View GitHub Repo</p>
                    </div>
                  </a>
                )}
                {project.demoLink && (
                  <a href={project.demoLink} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all group">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                      <ExternalLink size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Live Demo</p>
                      <p className="text-xs text-blue-600 font-medium">Try it Live</p>
                    </div>
                  </a>
                )}
                {project.reportUrl && canViewReport && (
                  <a href={project.reportUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all group md:col-span-2">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Project Documentation</p>
                      <p className="text-xs text-red-600 font-medium">Download / View Report</p>
                    </div>
                    <ArrowLeft size={20} className="rotate-180 text-gray-300 group-hover:text-red-400" />
                  </a>
                )}
              </div>

              {/* Publication Details */}
              {project.projectType === "Publication" && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="text-blue-600" size={20} />
                    <h2 className="text-xl font-bold text-gray-900">Publication Details</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Publication Title</p>
                      <p className="text-gray-900 font-bold">{project.publicationTitle || project.title}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Type</p>
                      <p className="text-gray-900 font-bold">{project.publicationType || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Journal / Conference</p>
                      <p className="text-gray-900 font-bold">{project.journalName || "N/A"}</p>
                    </div>
                    {project.paperLink && (
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Paper Link</p>
                        <a
                          href={project.paperLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          View Publication <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Screenshot Gallery */}
          {project.screenshotUrls && project.screenshotUrls.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Layout className="text-blue-600" size={20} /> Project Gallery
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.screenshotUrls.map((url, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video group relative">
                    <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Screenshot ${i + 1}`} />
                    <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink className="text-white" size={24} />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Student Info & Card */}
        <div className="space-y-8">
          <section className="bg-white rounded-xl border border-blue-100 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="text-blue-600" size={20} /> Team Members
            </h3>
            <div className="space-y-4">
              {project.students?.filter(s => s.name?.trim()).map((s, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-white transition-all">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <div className="mt-1 text-xs font-bold text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-blue-600">{s.regNo}</span>
                    <span>{s.dept}</span>
                    <span>{s.year} Year</span>
                  </div>

                </div>
              ))}
            </div>
          </section>

          <section className="bg-blue-600 rounded-xl p-8 text-white shadow-xl">
            <Calendar className="mb-4 opacity-80" size={32} />
            <h3 className="text-xl font-bold mb-2">Submission Details</h3>
            <div className="space-y-4 opacity-90">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Academic Year</p>
                <p className="font-bold">{displayYear}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Department</p>
                <p className="font-bold">{projectDept}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
