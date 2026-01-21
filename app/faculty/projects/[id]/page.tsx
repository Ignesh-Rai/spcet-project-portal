"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { doc, onSnapshot } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Trophy,
    ExternalLink,
    Github,
    FileText,
    Edit3,
    Clock,
    User,
    ChevronRight,
    MessageCircle,
    Calendar,
    Briefcase,
    RefreshCcw,
    Info
} from "lucide-react"

export default function FacultyProjectDetails() {
    const params = useParams() as { id?: string }
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = params?.id
    const returnTab = searchParams.get("tab") || "drafts"
    const returnPage = searchParams.get("page") || "1"

    const [project, setProject] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [authChecked, setAuthChecked] = useState(false)
    const [user, setUser] = useState<any>(null)

    // Auth Protection
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace("/login")
                return
            }
            setUser(user)
            setAuthChecked(true)
        })
        return () => unsub()
    }, [router])

    // Fetch Project
    useEffect(() => {
        if (!authChecked || !id || !auth.currentUser) return

        const unsub = onSnapshot(doc(db, "projects", id), (snap) => {
            if (snap.exists()) {
                const data = snap.data()
                setProject({ id: snap.id, ...data })
            }
            setLoading(false)
        }, (error) => {
            if (error.code === "permission-denied") {
                if (auth.currentUser) {
                    console.error("Faculty project details listener error:", error)
                }
                setLoading(false)
            } else {
                console.error("Faculty project details listener error:", error)
            }
        })
        return () => unsub()
    }, [id, authChecked, auth.currentUser])

    if (!authChecked || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Project Not Found</h1>
                <Link href={`/faculty/dashboard?tab=${returnTab}&page=${returnPage}`} scroll={false} className="mt-4 text-blue-600 flex items-center gap-2 hover:underline">
                    <ArrowLeft size={20} /> Back to Dashboard
                </Link>
            </div>
        )
    }

    const projectDept = project.dept || project.department || "N/A"
    const projectYear = project.academicYear || project.year || "N/A"

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 sticky top-22 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/faculty/dashboard?tab=${returnTab}&page=${returnPage}`} scroll={false} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">Project Details</h1>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${project.visibility === 'public' ? 'bg-green-100 text-green-700 border-green-200' :
                                    project.visibility === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                        project.visibility === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                    {project.visibility || 'Draft'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{projectDept} • {project.projectType || 'Project'}</p>
                        </div>
                    </div>
                    {project.visibility !== 'public' && (
                        <Link
                            href={`/faculty/project-submission?edit=${project.id}&tab=${returnTab}&page=${returnPage}`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-100"
                        >
                            <Edit3 size={18} /> Edit Project
                        </Link>
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
                                    <Clock size={48} />
                                    <p className="mt-2 font-medium">No Thumbnail Uploaded</p>
                                </div>
                            )}
                        </div>
                        <div className="p-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">{project.title}</h2>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {project.technologies?.map((tech: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100">{tech}</span>
                                ))}
                            </div>
                            <div className="prose max-w-none text-gray-600 leading-relaxed">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 underline decoration-blue-500 decoration-2 underline-offset-4">Abstract</h3>
                                <p className="whitespace-pre-wrap">{project.abstract}</p>
                            </div>
                        </div>
                    </section>

                    {/* Publication Details */}
                    {project.projectType === "Publication" && (
                        <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                            <div className="flex items-center gap-2 mb-6 text-blue-600">
                                <FileText size={24} />
                                <h3 className="text-xl font-bold text-gray-900">Publication Information</h3>
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
                        </section>
                    )}

                    {/* Screenshot Gallery */}
                    {project.screenshotUrls?.length > 0 && (
                        <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-blue-600 pl-4 uppercase tracking-tight">Project Gallery</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {project.screenshotUrls.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow bg-gray-50 block aspect-video">
                                        <img src={url} className="w-full h-full object-cover" alt={`Screenshot ${i + 1}`} />
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Resources */}
                    <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-blue-600 pl-4 uppercase tracking-tight">Resources & Links</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.githubLink && (
                                <a href={project.githubLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        <Github size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Source Code</p>
                                        <p className="text-xs text-blue-600 flex items-center gap-1">View on GitHub <ExternalLink size={10} /></p>
                                    </div>
                                </a>
                            )}
                            {project.demoLink && (
                                <a href={project.demoLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        <ExternalLink size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Live Demo</p>
                                        <p className="text-xs text-blue-600 flex items-center gap-1">Visit Project <ExternalLink size={10} /></p>
                                    </div>
                                </a>
                            )}
                            {project.reportUrl && (
                                <a href={project.reportUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all group col-span-full">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Project Documentation</p>
                                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">Download / View PDF <ExternalLink size={10} /></p>
                                    </div>
                                </a>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-8">
                    {/* HoD Feedback Section */}
                    {project.visibility === 'rejected' && project.hodFeedback && (
                        <section className="bg-red-50 rounded-xl border-2 border-red-200 p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                                <MessageCircle size={20} className="text-red-600" /> Rejection Feedback
                            </h3>
                            <div className="p-4 bg-white rounded-lg border border-red-100">
                                <p className="text-red-800 text-sm leading-relaxed italic">&quot;{project.hodFeedback}&quot;</p>
                            </div>
                        </section>
                    )}

                    {/* Team Info */}
                    <section className="bg-white rounded-xl border border-blue-100 p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                            <User className="text-blue-600" size={20} /> Team Members
                        </h3>
                        <div className="space-y-4">
                            {project.students?.filter((s: any) => s.name?.trim()).map((s: any, i: number) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-blue-200 transition-all">
                                    <p className="font-bold text-gray-900">{s.name}</p>
                                    <div className="mt-1 text-xs font-bold text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                                        <span className="text-blue-600">{s.regNo}</span>
                                        <span>{s.dept}</span>
                                        <span>{s.year} Year</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1 text-[10px] text-gray-400">
                                        <p className="flex items-center gap-1"><span className="w-1 h-1 bg-gray-300 rounded-full"></span> {s.email}</p>
                                        <p className="flex items-center gap-1"><span className="w-1 h-1 bg-gray-300 rounded-full"></span> {s.phone}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Submission Metadata */}
                    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Info size={14} className="text-blue-500" /> Submission Info
                            </h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                    <Calendar size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Academic Year</p>
                                    <p className="text-sm font-bold text-gray-900">{projectYear}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                                    <Briefcase size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Project Category</p>
                                    <p className="text-sm font-bold text-gray-900">{project.projectType || 'College Project'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center gap-3 text-gray-400">
                                <RefreshCcw size={12} className="animate-spin-slow" />
                                <span className="text-[11px] font-medium tracking-tight">
                                    Last synced on {project.updatedAt?.toDate?.().toLocaleDateString() || 'Recently'}
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
