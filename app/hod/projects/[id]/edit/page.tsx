"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, X, UploadCloud, FileIcon, Trash2, CheckCircle2, AlertCircle, Info, Eye, User, ExternalLink, Save } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { uploadScreenshots, uploadProjectReport, uploadToCloudinary } from "@/lib/cloudinary"

const departments = ["CSE", "IT", "AIDS", "CSBS", "ECE", "EEE", "Biotech", "Mech", "Civil", "Chemical", "MBA"]

export default function HoDProjectEdit() {
    const params = useParams()
    const id = params?.id as string

    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Loading editor...</div>}>
            <HoDEditContent projectId={id} />
        </Suspense>
    )
}

function HoDEditContent({ projectId }: { projectId: string }) {
    const router = useRouter()

    const [title, setTitle] = useState("")
    const [department, setDepartment] = useState("")
    const [academicYear, setAcademicYear] = useState("")
    const [projectType, setProjectType] = useState("")
    const [techStack, setTechStack] = useState("")
    const [demoLink, setDemoLink] = useState("")
    const [githubLink, setGithubLink] = useState("")
    const [abstractText, setAbstractText] = useState("")
    const [publicationTitle, setPublicationTitle] = useState("")
    const [publicationType, setPublicationType] = useState("")
    const [journalName, setJournalName] = useState("")
    const [paperLink, setPaperLink] = useState("")
    const [isTitleSame, setIsTitleSame] = useState(false)
    const [guideName, setGuideName] = useState("")
    const [batchNo, setBatchNo] = useState("")

    const [students, setStudents] = useState<any[]>(
        Array.from({ length: 5 }).map(() => ({
            name: "", regNo: "", dept: "", year: "", email: "", phone: "",
        }))
    )

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [uploadMessage, setUploadMessage] = useState("")
    const [toasts, setToasts] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([])
    const [thumbnail, setThumbnail] = useState<File | string | null>(null)
    const [screenshots, setScreenshots] = useState<(File | string)[]>([])
    const [report, setReport] = useState<File | string | null>(null)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const docRef = doc(db, "projects", projectId)
                const snap = await getDoc(docRef)
                if (snap.exists()) {
                    const data = snap.data()
                    setTitle(data.title || "")
                    setDepartment(data.dept || data.department || "")
                    setAcademicYear(data.year || "")
                    setProjectType(data.projectType || "")
                    setTechStack(data.technologies?.join(", ") || "")
                    setDemoLink(data.demoLink || "")
                    setGithubLink(data.githubLink || "")
                    setAbstractText(data.abstract || "")
                    if (data.students) {
                        const fullStudents = Array.from({ length: 5 }).map((_, i) =>
                            data.students[i] || { name: "", regNo: "", dept: "", year: "", email: "", phone: "" }
                        )
                        setStudents(fullStudents)
                    }
                    if (data.thumbnailUrl) setThumbnail(data.thumbnailUrl)
                    if (data.screenshotUrls) setScreenshots(data.screenshotUrls)
                    if (data.reportUrl) setReport(data.reportUrl)
                    if (data.publicationTitle) setPublicationTitle(data.publicationTitle)
                    if (data.publicationType) setPublicationType(data.publicationType)
                    if (data.journalName) setJournalName(data.journalName)
                    if (data.paperLink) setPaperLink(data.paperLink)
                    if (data.isTitleSame) setIsTitleSame(data.isTitleSame)
                    if (data.guideName) setGuideName(data.guideName)
                    if (data.batchNo) setBatchNo(data.batchNo)
                }
            } catch (err) {
                console.error(err)
                addToast("Failed to load project", "error")
            } finally {
                setLoading(false)
            }
        }
        fetchProject()
    }, [projectId])

    async function handleUpdate() {
        if (!title || !department || !academicYear) {
            addToast("Please fill in basic details (Title, Dept, Year)", "error")
            return
        }

        setSubmitting(true)
        setProgress(5)
        setUploadMessage("Preparing update...")

        try {
            let thumbUrl = typeof thumbnail === 'string' ? thumbnail : ""
            if (thumbnail instanceof File) {
                setUploadMessage("Uploading thumbnail...")
                thumbUrl = await uploadToCloudinary(thumbnail)
                setProgress(30)
            }

            let scUrls = screenshots.filter(s => typeof s === 'string') as string[]
            const newScFiles = screenshots.filter(s => s instanceof File) as File[]
            if (newScFiles.length > 0) {
                setUploadMessage("Uploading screenshots...")
                const newUrls = await uploadScreenshots(newScFiles, projectId)
                scUrls = [...scUrls, ...newUrls]
                setProgress(60)
            }

            let repUrl = typeof report === 'string' ? report : ""
            if (report instanceof File) {
                setUploadMessage("Uploading report...")
                repUrl = await uploadProjectReport(report, projectId)
                setProgress(80)
            }

            const payload = {
                title,
                dept: department,
                department: department,
                year: academicYear,
                academicYear,
                projectType,
                technologies: techStack.split(",").map(t => t.trim()).filter(t => t),
                demoLink,
                githubLink,
                abstract: abstractText,
                students: students.filter(s => s.name.trim()),
                thumbnailUrl: thumbUrl,
                screenshotUrls: scUrls,
                reportUrl: repUrl,
                publicationTitle: isTitleSame ? title : publicationTitle,
                publicationType,
                journalName,
                paperLink,
                isTitleSame,
                guideName,
                batchNo,
                updatedAt: new Date(),
            }

            await updateDoc(doc(db, "projects", projectId), payload)
            setProgress(100)
            setUploadMessage("Update Successful!")
            addToast("Project updated successfully", "success")

            setTimeout(() => {
                router.push(`/hod/projects/${projectId}`)
            }, 1000)

        } catch (err) {
            console.error(err)
            addToast("Update failed. Please try again.", "error")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading project data...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-10">
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 border border-gray-200"
                    >
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">HoD Content Editor</h1>
                        <p className="text-gray-500 font-medium">Refining: {title}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Basic Info */}
                        <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 text-blue-700 flex items-center gap-2">
                                <Info size={20} /> Project Core Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Project Title" value={title} onChange={setTitle} />
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-gray-700">Department</label>
                                    <select
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                    >
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <FormInput label="Academic Year" value={academicYear} onChange={setAcademicYear} placeholder="e.g. 2026" />
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-gray-700">Project Type</label>
                                    <select
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        value={projectType}
                                        onChange={e => setProjectType(e.target.value)}
                                    >
                                        <option>College Project</option>
                                        <option>Product</option>
                                        <option>Publication</option>
                                        <option>Patent</option>
                                    </select>
                                </div>
                                <FormInput label="Guide Name" value={guideName} onChange={setGuideName} />
                                <FormInput label="Batch No" value={batchNo} onChange={setBatchNo} />
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Technologies / Methods Used (Comma separated)</label>
                                    <input
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        value={techStack}
                                        onChange={e => setTechStack(e.target.value)}
                                        placeholder="e.g. React, Python, PCR"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Abstract</label>
                                    <textarea
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                                        value={abstractText}
                                        onChange={e => setAbstractText(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Team Details */}
                        <section className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 text-blue-700 flex items-center gap-2">
                                <User size={20} /> Team Members
                            </h2>
                            <div className="space-y-6">
                                {students.map((s, idx) => (
                                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-4">
                                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                Student {idx + 1} {idx === 0 && <span className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px]">Team Leader</span>}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <StudentInput label="Name" value={s.name} onChange={(v) => updateStudent(idx, 'name', v)} />
                                            <StudentInput label="Reg No" value={s.regNo} onChange={(v) => updateStudent(idx, 'regNo', v)} />
                                            <StudentInput label="Email" value={s.email} onChange={(v) => updateStudent(idx, 'email', v)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-8">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
                            <h3 className="text-lg font-bold mb-4 text-gray-900">Update Controls</h3>
                            <button
                                onClick={handleUpdate}
                                disabled={submitting}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save size={20} className="group-hover:scale-110 transition-transform" />
                                )}
                                <span>{submitting ? "Updating..." : "Save Changes"}</span>
                            </button>
                            <p className="text-[10px] text-gray-400 mt-4 text-center font-medium leading-relaxed italic">
                                Note: Editing as HoD directly overrides the project data. Changes are reflected immediately to all views.
                            </p>
                        </div>

                        {/* File Management (Simplified) */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                                <UploadCloud size={18} className="text-blue-500" /> Resources
                            </h3>
                            <div className="space-y-4">
                                {thumbnail && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Eye size={16} className="text-gray-400" />
                                            <span className="text-xs font-bold text-gray-700">Project Thumbnail</span>
                                        </div>
                                        <button onClick={() => setThumbnail(null)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                )}
                                {report && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileIcon size={16} className="text-gray-400" />
                                            <span className="text-xs font-bold text-gray-700">Project Report (PDF)</span>
                                        </div>
                                        <button onClick={() => setReport(null)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 italic">Limited editing for files in HoD fast-mode. Delete current file to upload new if needed.</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <ProgressModal open={submitting} progress={progress} message={uploadMessage} />
            <ToastContainer toasts={toasts} />
        </div>
    )

    function updateStudent(idx: number, field: string, value: string) {
        setStudents(prev => {
            const copy = [...prev]
            copy[idx] = { ...copy[idx], [field]: value }
            return copy
        })
    }
}

function FormInput({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">{label}</label>
            <input
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    )
}

function StudentInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
            <input
                className="p-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-sm font-bold text-gray-800"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    )
}

function ProgressModal({ open, progress, message }: { open: boolean, progress: number, message: string }) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl p-10 w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
            >
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                    <UploadCloud className="animate-bounce" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-1 text-gray-900">{message}</h3>
                <p className="text-xs text-gray-400 mb-6 font-medium">Please wait while we sync with servers...</p>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-blue-600 transition-all duration-300"
                    />
                </div>
                <span className="text-[10px] font-black text-blue-600">{progress}% COMPLETE</span>
            </motion.div>
        </div>
    )
}

function ToastContainer({ toasts }: { toasts: any[] }) {
    return (
        <div className="fixed bottom-10 right-10 z-[300] flex flex-col-reverse gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-bold
                        ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : ''}
                        ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : ''}
                        ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle2 size={16} />}
                    {toast.type === 'error' && <AlertCircle size={16} />}
                    {toast.type === 'info' && <Info size={16} />}
                    {toast.message}
                </div>
            ))}
        </div>
    )
}
