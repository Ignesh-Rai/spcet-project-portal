"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { doc, onSnapshot, getDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { updateProject } from "@/lib/db/projects"
import { onAuthStateChanged } from "firebase/auth"
import { ArrowLeft, CheckCircle2, AlertCircle, Trophy, ExternalLink, Github, FileText, Send, Trash2, Layout } from "lucide-react"

export default function HoDProjectReview() {
    const params = useParams() as { id?: string }
    const router = useRouter()
    const id = params?.id

    const [project, setProject] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [authChecked, setAuthChecked] = useState(false)
    const [feedback, setFeedback] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notification, setNotification] = useState<{ open: boolean, title: string, message: string, type: 'success' | 'error' | 'info' }>({
        open: false,
        title: "",
        message: "",
        type: "success"
    })

    // Auth Protection
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace("/login")
                return
            }
            const token = await user.getIdTokenResult()
            if (token.claims.role !== "hod") {
                // Redirect to faculty dashboard if user is faculty, otherwise to login
                if (token.claims.role === "faculty") {
                    router.replace("/faculty/dashboard")
                } else {
                    router.replace("/login")
                }
                return
            }
            setAuthChecked(true)
        })
        return () => unsub()
    }, [router])

    // Fetch Project
    useEffect(() => {
        if (!authChecked || !id || !auth.currentUser) return

        const unsub = onSnapshot(doc(db, "projects", id), (snap) => {
            if (snap.exists()) {
                setProject({ id: snap.id, ...snap.data() })
            }
            setLoading(false)
        }, (error) => {
            if (error.code === "permission-denied") {
                if (auth.currentUser) {
                    console.error("HoD project details listener error:", error)
                }
                setLoading(false)
            } else {
                console.error("HoD project details listener error:", error)
            }
        })
        return () => unsub()
    }, [id, authChecked, auth.currentUser])

    async function handleApprove() {
        if (!project) return
        setIsSubmitting(true)
        try {
            await updateProject(project.id, {
                visibility: "public",
                updatedAt: new Date()
            })
            setNotification({
                open: true,
                title: "Success",
                message: "Project has been approved and published.",
                type: "success"
            })
            setTimeout(() => {
                router.push("/hod/dashboard")
            }, 1500)
        } catch (err) {
            console.error(err)
            setNotification({
                open: true,
                title: "Error",
                message: "Failed to approve project.",
                type: "error"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleReject() {
        if (!project) return
        if (!feedback.trim()) return alert("Please provide feedback for rejection.")
        setIsSubmitting(true)
        try {
            await updateProject(project.id, {
                visibility: "rejected",
                hodFeedback: feedback,
                updatedAt: new Date()
            })
            setNotification({
                open: true,
                title: "Rejected",
                message: "Project feedback has been sent to faculty.",
                type: "info"
            })
            setTimeout(() => {
                router.push("/hod/dashboard")
            }, 1500)
        } catch (err) {
            console.error(err)
            setNotification({
                open: true,
                title: "Error",
                message: "Failed to reject project.",
                type: "error"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleHallOfFame() {
        if (!project) return
        setIsSubmitting(true)
        try {
            await updateProject(project.id, {
                hallOfFame: !project.hallOfFame,
                updatedAt: new Date()
            })
            setNotification({
                open: true,
                title: project.hallOfFame ? "Removed" : "Added",
                message: project.hallOfFame ? "Project removed from Hall of Fame." : "Project added to Hall of Fame!",
                type: "success"
            })
        } catch (err) {
            console.error(err)
            setNotification({
                open: true,
                title: "Error",
                message: "Failed to update Hall of Fame status.",
                type: "error"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

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
                <Link href="/hod/dashboard" className="mt-4 text-blue-600 flex items-center gap-2 hover:underline">
                    <ArrowLeft size={20} /> Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 sticky top-21 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/hod/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Review Project</h1>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{(project.dept || project.department)} • {project.projectType}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleHallOfFame}
                            disabled={isSubmitting}
                            className={`p-2 rounded-lg transition-colors border ${project.hallOfFame ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-yellow-600'}`}
                            title={project.hallOfFame ? "Remove from Hall of Fame" : "Add to Hall of Fame"}
                        >
                            <Trophy size={20} fill={project.hallOfFame ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Project Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Main Info */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="w-full bg-gray-50 flex items-center justify-center">
                            {project.thumbnailUrl ? (
                                <img
                                    src={project.thumbnailUrl}
                                    className="w-full h-auto object-contain block"
                                    alt={project.title}
                                />
                            ) : (
                                <div className="w-full h-[300px] flex items-center justify-center text-gray-400">
                                    <Layout size={48} />
                                    <p className="mt-2 font-medium">No Thumbnail available</p>
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
                            <div className="prose max-w-none text-gray-600 leading-relaxed text-sm">
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

                    {/* Screenshots */}
                    {project.screenshotUrls?.length > 0 && (
                        <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Project Gallery</h3>
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
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Resources & Links</h3>
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
                                <a href={project.reportUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Project Report</p>
                                        <p className="text-xs text-blue-600 flex items-center gap-1">View PDF <ExternalLink size={10} /></p>
                                    </div>
                                </a>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Sidebar Action & Student Info */}
                <div className="space-y-8">
                    {/* Student Info */}
                    <section className="bg-white rounded-xl border border-blue-400 p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-blue-700 mb-6">Team Details</h3>
                        <div className="space-y-4">
                            {project.students?.filter((s: any) => s.name?.trim()).map((s: any, i: number) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 transition-all">
                                    <p className="font-bold text-gray-900">{s.name}</p>
                                    <div className="mt-1 text-xs font-bold text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                                        <span className="text-blue-600">{s.regNo}</span>
                                        <span>{s.dept}</span>
                                        <span>{s.year} Year</span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        <p>{s.email}</p>
                                        <p>{s.phone}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Review Action Card / HoF Toggle */}
                    {project.visibility === 'public' ? (
                        <section className="bg-white rounded-xl border-2 border-yellow-400 p-8 shadow-xl top-24">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Trophy size={20} className="text-yellow-500" /> Hall of Fame
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">Manage this project&apos;s visibility in the Hall of Fame.</p>

                            <button
                                onClick={handleHallOfFame}
                                disabled={isSubmitting}
                                className={`w-full py-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 border shadow-lg ${project.hallOfFame
                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                    : 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600 shadow-yellow-100'
                                    }`}
                            >
                                {project.hallOfFame ? (
                                    <><Trash2 size={20} /> Remove from Hall of Fame</>
                                ) : (
                                    <><Trophy size={20} /> Add to Hall of Fame</>
                                )}
                            </button>
                        </section>
                    ) : (
                        <section className="bg-white rounded-xl border-2 border-blue-600 p-8 shadow-xl top-24">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Send size={20} className="text-blue-600" /> Decision Panel
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">Review the project details and provide your final verdict.</p>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Feedback is only required if you are <span className="text-red-600 font-bold text-[10px] uppercase">rejecting</span> the project.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rejection Feedback (Optional for Approval)</label>
                                    <textarea
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition-all resize-none text-gray-900"
                                        placeholder="Explain why this project is being rejected..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {project.visibility !== 'rejected' && (
                                        <button
                                            onClick={handleApprove}
                                            disabled={isSubmitting}
                                            className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={20} /> Approve & Publish
                                        </button>
                                    )}
                                    <button
                                        onClick={handleReject}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
                                    >
                                        <AlertCircle size={20} /> Reject with Feedback
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
            <NotificationModal
                open={notification.open}
                title={notification.title}
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification(prev => ({ ...prev, open: false }))}
            />
        </div>
    )
}

/* ===============================
   Notification Modal (Toast Replacement)
   =============================== */
function NotificationModal({ open, title, message, type, onClose }: any) {
    if (!open) return null;
    const colors = {
        success: "bg-green-50 text-green-700 border-green-100",
        error: "bg-red-50 text-red-700 border-red-100",
        info: "bg-blue-50 text-blue-700 border-blue-100",
    } as any;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all p-4">
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 border border-gray-100 text-center animate-in zoom-in-95 duration-200`}>
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 ${colors[type]}`}>
                    {type === 'success' && <CheckCircle2 size={32} />}
                    {type === 'error' && <AlertCircle size={32} />}
                    {type === 'info' && <AlertCircle size={32} className="rotate-180" />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-500 mb-8">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
