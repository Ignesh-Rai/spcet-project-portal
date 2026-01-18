"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, X, UploadCloud, FileIcon, Trash2, CheckCircle2, AlertCircle, Info, Eye, User, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { createProject, updateProject } from "@/lib/db/projects"
import { uploadScreenshots, uploadProjectReport, uploadToCloudinary } from "@/lib/cloudinary"

const MAX_IMAGE_SIZE = 500 * 1024 // 500 KB
const MAX_SCREENSHOTS = 5
const MAX_PDF_SIZE = 5 * 1024 * 1024 // 5 MB

export default function ProjectSubmission() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Loading form...</div>}>
      <ProjectFormContent />
    </Suspense>
  )
}

function ProjectFormContent() {
  const router = useRouter()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const editId = searchParams?.get("edit")
  // ===============================
  // UPDATED STATE
  // ===============================
  const [teamSize, setTeamSize] = useState(2)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

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

  const [students, setStudents] = useState<any[]>(
    Array.from({ length: 5 }).map(() => ({
      name: "",
      regNo: "",
      dept: "",
      year: "",
      email: "",
      phone: "",
    }))
  )

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadMessage, setUploadMessage] = useState("")

  // ===============================
  // NEW RESOURCE STATE
  // ===============================
  const [thumbnail, setThumbnail] = useState<File | string | null>(null)
  const [screenshots, setScreenshots] = useState<(File | string)[]>([])
  const [report, setReport] = useState<File | string | null>(null)
  const [isDraftLoading, setIsDraftLoading] = useState(false)
  const [toasts, setToasts] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([])
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Fetch Draft Data
  useEffect(() => {
    if (editId) {
      const fetchDraft = async () => {
        setIsDraftLoading(true)
        try {
          const docRef = doc(db, "projects", editId)
          const snap = await getDoc(docRef)
          if (snap.exists()) {
            const data = snap.data()
            setTitle(data.title || "")
            setDepartment(data.dept || data.dept || "")
            setAcademicYear(data.year || "")
            setProjectType(data.projectType || "")
            setTechStack(data.technologies?.join(", ") || "")
            setDemoLink(data.demoLink || "")
            setGithubLink(data.githubLink || "")
            setAbstractText(data.abstract || "")
            if (data.students) {
              setTeamSize(data.students.length)
              // Ensure we have a 5-member array even if fewer are saved
              const fullStudents = Array.from({ length: 5 }).map((_, i) =>
                data.students[i] || { name: "", regNo: "", dept: "", year: "", email: "", phone: "" }
              )
              setStudents(fullStudents)
            }
            if (data.thumbnailUrl) setThumbnail(data.thumbnailUrl)
            if (data.screenshotUrls) setScreenshots(data.screenshotUrls)
            if (data.reportUrl) setReport(data.reportUrl)

            // New fields
            if (data.publicationTitle) setPublicationTitle(data.publicationTitle)
            if (data.publicationType) setPublicationType(data.publicationType)
            if (data.journalName) setJournalName(data.journalName)
            if (data.paperLink) setPaperLink(data.paperLink)
            if (data.isTitleSame) setIsTitleSame(data.isTitleSame)

            addToast("Draft data loaded", "success")
          } else {
            addToast("Draft not found", "error")
          }
        } catch (err) {
          console.error("Error loading draft:", err)
          addToast("Failed to load draft", "error")
        } finally {
          setIsDraftLoading(false)
        }
      }
      fetchDraft()
    }
  }, [editId])

  const MAX_IMAGE_SIZE = 500 * 1024 // 500KB as requested
  const MAX_SCREENSHOTS = 4
  const MAX_PDF_SIZE = 5 * 1024 * 1024 // 5MB as requested

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login")
        return
      }
      setCurrentUser(u)
    })
    return () => unsub()
  }, [router])

  function handleTeamSizeChange(newSize: number) {
    setTeamSize(newSize)
    setStudents(prev => {
      const newStudents = [...prev]
      if (newSize > prev.length) {
        for (let i = prev.length; i < newSize; i++) {
          newStudents.push({ name: "", regNo: "", dept: "", year: "", email: "", phone: "" })
        }
      } else {
        newStudents.length = newSize
      }
      return newStudents
    })
  }

  function handleClearAll() {
    setShowConfirmClear(true)
  }

  function executeClearAll() {
    setTitle("")
    setDepartment("")
    setAcademicYear("")
    setProjectType("")
    setTechStack("")
    setDemoLink("")
    setGithubLink("")
    setAbstractText("")
    setTeamSize(2)
    setStudents(Array.from({ length: 5 }).map(() => ({
      name: "", regNo: "", dept: "", year: "", email: "", phone: ""
    })))
    setThumbnail(null)
    setScreenshots([])
    setReport(null)
    setShowConfirmClear(false)
    addToast("Form cleared successfully", "info")
  }

  /* ---------- Progress & Confirm Modals ---------- */
  function ProgressModal({ open, progress, message }: { open: boolean, progress: number, message: string }) {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-xl p-10 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <UploadCloud className="text-blue-600 animate-bounce" size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900">{message}</h3>
            <p className="text-gray-500 mb-8">Please don&apos;t close this window until process completes.</p>

            <div className="w-full bg-gray-100 rounded-full h-4 mb-4 overflow-hidden relative">
              <motion.div
                className="bg-blue-600 h-full rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </motion.div>
            </div>

            <div className="flex justify-between w-full text-sm font-bold">
              <span className="text-blue-600">{progress}% Complete</span>
              <span className="text-gray-400">Processing...</span>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  function ConfirmModal({
    open,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = "Confirm",
    confirmColor = "blue",
    icon: Icon = Trash2
  }: {
    open: boolean,
    onConfirm: () => void,
    onCancel: () => void,
    title: string,
    message: string,
    confirmText?: string,
    confirmColor?: "blue" | "red" | "green",
    icon?: any
  }) {
    if (!open) return null

    const colorClasses = {
      blue: "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
      red: "bg-red-600 hover:bg-red-700 shadow-red-100",
      green: "bg-green-600 hover:bg-green-700 shadow-green-100"
    }

    const iconBgClasses = {
      blue: "bg-blue-50 text-blue-600",
      red: "bg-red-50 text-red-600",
      green: "bg-green-50 text-green-600"
    }

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl"
        >
          <div className={`w-16 h-16 ${iconBgClasses[confirmColor]} rounded-full flex items-center justify-center mb-6 mx-auto`}>
            <Icon size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2 text-center text-gray-900">{title}</h3>
          <p className="text-gray-500 text-center mb-8">{message}</p>

          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 ${colorClasses[confirmColor]} text-white font-bold rounded-xl shadow-lg transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ---------- File Upload Component ---------- */
  function FileUploadBox({
    label,
    accept,
    multiple = false,
    maxSize,
    maxFiles = 1,
    files,
    onFilesChange,
    description
  }: {
    label: string,
    accept: string,
    multiple?: boolean,
    maxSize: number,
    maxFiles?: number,
    files: File | string | (File | string)[] | null,
    onFilesChange: (files: File | string | (File | string)[] | null) => void,
    description: string
  }) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleFileSelect = (newFiles: FileList | null) => {
      if (!newFiles) return
      const selected = Array.from(newFiles)

      // Validate files
      for (const file of selected) {
        if (file.size > maxSize) {
          addToast(`File ${file.name} is too large. Max size is ${maxSize / (1024 * 1024)}MB`, "error")
          return
        }
      }

      if (multiple) {
        const currentFiles = Array.isArray(files) ? files : []
        if (currentFiles.length + selected.length > maxFiles) {
          addToast(`Maximum ${maxFiles} files allowed`, "error")
          return
        }
        onFilesChange([...currentFiles, ...selected])
        addToast(`${selected.length} file(s) added`, "success")
      } else {
        onFilesChange(selected[0])
        addToast("File uploaded", "success")
      }
    }

    const removeFile = (index?: number) => {
      if (multiple && index !== undefined) {
        const currentFiles = Array.isArray(files) ? (files as (File | string)[]) : []
        onFilesChange(currentFiles.filter((_, i) => i !== index))
      } else {
        onFilesChange(null)
      }
    }

    return (
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-900">{label}</label>

        <div className="space-y-4">
          {(!multiple && files) ? null : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFileSelect(e.dataTransfer.files)
              }}
              className={`
                border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"}
              `}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e.target.files)}
                accept={accept}
                multiple={multiple}
                className="hidden"
              />
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <UploadCloud size={32} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">Drag and drop or <span className="text-blue-600 underline">choose file</span> to upload.</p>
                <p className="text-xs text-gray-500 mt-2">{description}</p>
              </div>
            </div>
          )}

          <div className={multiple ? "grid grid-cols-2 md:grid-cols-4 gap-4" : "flex justify-center"}>
            {multiple && Array.isArray(files) ? (
              files.map((file, i) => (
                <FilePreview key={i} file={file} onRemove={() => removeFile(i)} isGrid={true} />
              ))
            ) : (
              files && !Array.isArray(files) && (
                <FilePreview file={files} onRemove={() => removeFile()} isGrid={false} />
              )
            )}
          </div>
        </div>
      </div>
    )
  }

  function FilePreview({ file, onRemove, isGrid }: { file: File | string, onRemove: () => void, isGrid: boolean }) {
    const isCloud = typeof file === 'string'

    // Improved detection for cloud images
    const isImage = isCloud
      ? (file.toLowerCase().includes('image') || file.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg|webp)/))
      : file.type.startsWith("image/")

    const [objectUrl] = useState(() => isCloud ? file : URL.createObjectURL(file as File))

    const fileName = isCloud ? "Cloud File" : (file as File).name
    const fileSize = isCloud ? "Cloud Stored" : `${((file as File).size / (1024 * 1024)).toFixed(2)} MB`

    if (isGrid) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col"
        >
          <div className="relative flex-1 bg-gray-50 overflow-hidden">
            {isImage ? (
              <img
                src={objectUrl}
                className="w-full h-full object-cover cursor-zoom-in"
                alt="preview"
                onClick={() => setLightboxImage(objectUrl)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" onClick={() => window.open(objectUrl)}>
                <FileIcon className="text-blue-600" size={32} />
                {isCloud && <ExternalLink size={12} className="text-blue-400" />}
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="w-10 h-10 bg-white/20 backdrop-blur-md text-white hover:bg-red-500 rounded-full flex items-center justify-center transition-all transform hover:scale-110 pointer-events-auto"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="absolute bottom-1 right-1 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-700 shadow-sm">
              {fileSize}
            </div>
          </div>
          <div className="bg-white px-2 py-1.5 border-t border-gray-50 text-center">
            <p className="text-[10px] font-semibold text-gray-600 truncate">{fileName}</p>
          </div>
        </motion.div>
      )
    }

    return (
      <div className="relative flex flex-col items-center gap-2 w-full">
        <div className="relative max-w-full">
          {isImage ? (
            <img
              src={objectUrl}
              className="max-h-72 w-auto object-contain cursor-zoom-in rounded-xl shadow-lg border border-gray-100"
              alt="preview"
              onClick={() => setLightboxImage(objectUrl)}
            />
          ) : (
            <div className="p-8 bg-blue-50 border border-blue-100 rounded-lg flex flex-col items-center gap-3 cursor-pointer group" onClick={() => window.open(objectUrl)}>
              <FileIcon className="text-blue-600 group-hover:scale-110 transition-transform" size={48} />
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1">View cloud file <ExternalLink size={12} /></span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center text-white bg-red-600 rounded-full hover:bg-red-700 transition-all shadow-lg border-2 border-white z-10"
          >
            <X size={16} />
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-sm font-bold text-gray-900 truncate max-w-[300px]">{fileName}</p>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{isCloud ? 'Existing File' : fileSize}</p>
        </div>
      </div>
    )
  }

  function Lightbox({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) {
    if (!imageUrl) return null
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-8" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-full max-h-full"
          onClick={e => e.stopPropagation()}
        >
          <img src={imageUrl} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain border border-white/10" alt="full size" />
          <button
            onClick={onClose}
            className="absolute -top-16 right-0 w-12 h-12 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={32} />
          </button>
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
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border whitespace-nowrap animate-none
              ${toast.type === 'success' ? 'bg-white border-green-200 text-green-900' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-200 text-red-900' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-200 text-blue-900' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle2 className="text-green-600" size={18} />}
            {toast.type === 'error' && <AlertCircle className="text-red-600" size={18} />}
            {toast.type === 'info' && <Info className="text-blue-600" size={18} />}
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        ))}
      </div>
    )
  }

  function buildPayload() {
    return {
      title,
      department: department, // Standardized field
      academicYear,
      abstract: abstractText,
      projectType,
      technologies: techStack.split(",").map(t => t.trim()).filter(Boolean),
      demoLink,
      githubLink,
      students: students.slice(0, teamSize),
      // Publication fields
      publicationTitle: isTitleSame ? title : publicationTitle,
      publicationType,
      journalName,
      paperLink,
      isTitleSame,
    }
  }

  async function handleSaveDraft() {
    if (!currentUser) return addToast("Please login as faculty.", "error")

    if (!title.trim() && !abstractText.trim() && !thumbnail) {
      return addToast("Can't save a completely empty draft!", "error")
    }

    setSubmitting(true)
    setProgress(10)
    setUploadMessage("Preparing draft...")

    try {
      const projectId = (editId || `project_${Date.now()}_${currentUser.uid}`).replace(/\s+/g, '_')

      setProgress(30)
      setUploadMessage("Uploading thumbnail...")
      let thumbnailUrl = typeof thumbnail === 'string' ? thumbnail : ""
      if (thumbnail && typeof thumbnail !== 'string') {
        thumbnailUrl = await uploadToCloudinary(thumbnail as File, `project-portal/${projectId}`)
      }

      setProgress(50)
      setUploadMessage("Uploading screenshots...")
      let screenshotUrls: string[] = screenshots.filter(s => typeof s === 'string') as string[]
      const newScreenshots = screenshots.filter(s => typeof s !== 'string') as File[]
      if (newScreenshots.length > 0) {
        const uploaded = await uploadScreenshots(newScreenshots, projectId)
        screenshotUrls = [...screenshotUrls, ...uploaded]
      }

      setProgress(70)
      setUploadMessage("Uploading report...")
      let reportUrl: string | null = typeof report === 'string' ? report : null
      if (report && typeof report !== 'string') {
        reportUrl = await uploadProjectReport(report as File, projectId)
      }

      setProgress(90)
      setUploadMessage("Saving to database...")
      const payload = {
        ...buildPayload(),
        thumbnailUrl,
        screenshotUrls,
        reportUrl
      }

      if (editId) {
        await updateProject(editId, payload)
      } else {
        await createProject(payload, {
          asDraft: true,
          facultyId: currentUser.uid,
        })
      }

      setProgress(100)
      setUploadMessage("Draft saved successfully!")
      setTimeout(() => {
        setSubmitting(false)
        router.push("/faculty/dashboard")
      }, 1000)
    } catch (error: any) {
      setSubmitting(false)
      addToast(error.message || "Failed to save draft", "error")
    }
  }

  async function handleSubmitForReview() {
    if (!currentUser) return addToast("Please login as faculty.", "error")

    // Validation
    const requiredFields: any = { title, department, academicYear, abstractText, techStack, projectType }

    if (projectType === "Publication") {
      if (!isTitleSame && !publicationTitle.trim()) requiredFields.publicationTitle = publicationTitle
      requiredFields.publicationType = publicationType
      requiredFields.journalName = journalName
      requiredFields.paperLink = paperLink
    }

    const emptyFields = Object.entries(requiredFields).filter(([_, v]) => typeof v === 'string' && !v.trim())

    if (emptyFields.length > 0) {
      return addToast(`Please fill all required fields: ${emptyFields.map(f => f[0]).join(", ")}`, "error")
    }

    if (!thumbnail) {
      return addToast("Please upload a thumbnail image.", "error")
    }

    // Student validation for all active team members
    const incompleteStudents = students.slice(0, teamSize).some(s => !s.name.trim() || !s.regNo.trim())
    if (incompleteStudents) {
      return addToast("Please fill name and reg. no for all student members.", "error")
    }

    setShowConfirmSubmit(true)
  }

  async function executeSubmit() {
    setShowConfirmSubmit(false)
    setSubmitting(true)
    setProgress(10)
    setUploadMessage("Preparing submission...")

    try {
      const projectId = (editId || `project_${Date.now()}_${currentUser.uid}`).replace(/\s+/g, '_')

      setProgress(30)
      setUploadMessage("Uploading thumbnail...")
      let thumbnailUrl = typeof thumbnail === 'string' ? thumbnail : ""
      if (thumbnail && typeof thumbnail !== 'string') {
        thumbnailUrl = await uploadToCloudinary(thumbnail as File, `project-portal/${projectId}`)
      }

      setProgress(50)
      setUploadMessage("Uploading screenshots...")
      let screenshotUrls: string[] = screenshots.filter(s => typeof s === 'string') as string[]
      const newScreenshots = screenshots.filter(s => typeof s !== 'string') as File[]
      if (newScreenshots.length > 0) {
        const uploaded = await uploadScreenshots(newScreenshots, projectId)
        screenshotUrls = [...screenshotUrls, ...uploaded]
      }

      setProgress(70)
      setUploadMessage("Uploading report...")
      let reportUrl: string | null = typeof report === 'string' ? report : null
      if (report && typeof report !== 'string') {
        reportUrl = await uploadProjectReport(report as File, projectId)
      }

      setProgress(90)
      setUploadMessage("Finalizing submission...")
      const payload = {
        ...buildPayload(),
        thumbnailUrl,
        screenshotUrls,
        reportUrl,
        visibility: "pending" // Force visibility to pending on submit
      }

      if (editId) {
        await updateProject(editId, payload)
      } else {
        await createProject(payload, {
          asDraft: false,
          facultyId: currentUser.uid,
        })
      }

      setProgress(100)
      setUploadMessage("Submitted for review!")
      setTimeout(() => {
        setSubmitting(false)
        router.push("/faculty/dashboard")
      }, 1000)
    } catch (error: any) {
      setSubmitting(false)
      addToast(error.message || "Failed to submit", "error")
    }
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20 px-4 relative">
      <ToastContainer toasts={toasts} />
      <Lightbox imageUrl={lightboxImage || ""} onClose={() => setLightboxImage(null)} />
      <ProgressModal open={submitting} progress={progress} message={uploadMessage} />
      <ConfirmModal
        open={showConfirmClear}
        onConfirm={executeClearAll}
        onCancel={() => setShowConfirmClear(false)}
        title="Clear Form Content?"
        message="Are you sure you want to reset the entire form? All entered data and uploaded files will be lost."
        confirmText="Clear All"
        confirmColor="red"
        icon={Trash2}
      />
      <ConfirmModal
        open={showConfirmSubmit}
        onConfirm={executeSubmit}
        onCancel={() => setShowConfirmSubmit(false)}
        title="Ready to Submit?"
        message="Your project will be sent for review. You won't be able to edit it until the review is complete."
        confirmText="Submit Project"
        confirmColor="blue"
        icon={CheckCircle2}
      />

      <div className="max-w-5xl mx-auto">
        <div className="relative mb-12">
          {/* Top Left Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="group absolute -top-4 -left-4 md:-left-12 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:bg-blue-50 transition-all border border-gray-100"
          >
            <ArrowLeft className="text-gray-600 group-hover:text-blue-600 transition-colors" size={24} />
          </button>

          <h1 className="text-3xl font-bold text-center text-gray-900 mt-2">{editId ? "Edit Project Draft" : "New Project Submission"}</h1>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-blue-700 flex items-center gap-2">
            Project Basic Info
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-semibold text-gray-900">Project Title</label>
              <input
                id="title"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter project title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="project-dept" className="text-sm font-semibold text-gray-900">Department</label>
              <select
                id="project-dept"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              >
                <option value="">Select Department</option>
                <option>CSE</option>
                <option>IT</option>
                <option>ECE</option>
                <option>EEE</option>
                <option>MECH</option>
                <option>CIVIL</option>
                <option>AIDS</option>
                <option>OTHER</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="academic-year" className="text-sm font-semibold text-gray-900">Academic Year</label>
              <input
                id="academic-year"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 2026"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="type" className="text-sm font-semibold text-gray-900">Project Type</label>
              <select
                id="type"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
              >
                <option value="">Select Project Type</option>
                <option>Product</option>
                <option>Publication</option>
                <option>College Project</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="tech" className="text-sm font-semibold text-gray-900">Tech Stack</label>
              <input
                id="tech"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. React, Firebase, Tailwind (separate with commas)"
                value={techStack}
                onChange={e => setTechStack(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="demo" className="text-sm font-semibold text-gray-900">Demo Link</label>
              <input
                id="demo"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://..."
                value={demoLink}
                onChange={e => setDemoLink(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="github" className="text-sm font-semibold text-gray-900">GitHub Link</label>
              <input
                id="github"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://github.com/..."
                value={githubLink}
                onChange={e => setGithubLink(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="abstract" className="text-sm font-semibold text-gray-900">Abstract / Description</label>
              <textarea
                id="abstract"
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                rows={6}
                placeholder="Detailed description of your project..."
                value={abstractText}
                onChange={e => setAbstractText(e.target.value)}
              />
            </div>
          </div>

          {/* Conditional Publication Fields */}
          <AnimatePresence>
            {projectType === "Publication" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-6"
              >
                <h3 className="text-lg font-bold text-blue-600">Publication Details</h3>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="same-title"
                      checked={isTitleSame}
                      onChange={(e) => setIsTitleSame(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="same-title" className="text-sm font-medium text-gray-700">Publishing Title same as Project Title</label>
                  </div>

                  {!isTitleSame && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900">Publishing Title</label>
                      <input
                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Enter the title as it appears in the publication"
                        value={publicationTitle}
                        onChange={e => setPublicationTitle(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900">Publication Type</label>
                      <select
                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={publicationType}
                        onChange={e => setPublicationType(e.target.value)}
                      >
                        <option value="">Select Category</option>
                        <option>Conference</option>
                        <option>Journal</option>
                        <option>Workshop</option>
                        <option>Book Chapter</option>
                        <option>Patent</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-900">Journal / Conference Name</label>
                      <input
                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. IEEE Explore, Springer"
                        value={journalName}
                        onChange={e => setJournalName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-900">Paper Link (URL)</label>
                    <input
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://doi.org/... or publisher URL"
                      value={paperLink}
                      onChange={e => setPaperLink(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Resources Section */}
        <section className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-blue-700">Resources</h2>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm space-y-6">
              <FileUploadBox
                label="Thumbnail Image"
                accept="image/*"
                maxSize={MAX_IMAGE_SIZE}
                files={thumbnail}
                onFilesChange={(f) => setThumbnail(f as File | string | null)}
                description="Upload one square/landscape image representing your project. JPG/PNG/SVG. Max 500KB."
              />

              <FileUploadBox
                label="Screenshots or Reference Images"
                accept="image/*"
                multiple
                maxFiles={MAX_SCREENSHOTS}
                maxSize={MAX_IMAGE_SIZE}
                files={screenshots}
                onFilesChange={(f) => setScreenshots(f as (File | string)[])}
                description={`Maximum ${MAX_SCREENSHOTS} images allowed. Show off your UI or architecture. JPG/PNG/SVG. Max 500KB per image.`}
              />
              {projectType === "Product" && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm font-medium">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center font-bold">!</span>
                  Upload your Product&apos;s Acknowledgement Letter in the Screenshots Uploading Section !!
                </div>
              )}

              <FileUploadBox
                label="Project Report PDF"
                accept=".pdf"
                maxSize={MAX_PDF_SIZE}
                files={report}
                onFilesChange={(f) => setReport(f as File | string | null)}
                description="One PDF file containing your project documentation. Max 5.0MB."
              />
            </div>
          </div>
        </section>

        {/* Student Team Info */}
        <section className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-6 text-blue-700">Student Team Info</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Team Size</h2>
                <p className="text-xs text-gray-500 font-medium">Select number of students in this project</p>
              </div>
            </div>
            <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTeamSize(num)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${teamSize === num ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {Array.from({ length: teamSize }).map((_, idx) => (
              <div key={idx} className="p-6 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-300">
                <h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">{idx + 1}</span>
                  Student Details
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Full Name</label>
                    <input
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 outline-none"
                      placeholder="Enter name"
                      value={students[idx].name}
                      onChange={e => {
                        const c = [...students]; c[idx].name = e.target.value; setStudents(c)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Register Number</label>
                    <input
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 outline-none"
                      placeholder="Reg. No"
                      value={students[idx].regNo}
                      onChange={e => {
                        const c = [...students]; c[idx].regNo = e.target.value; setStudents(c)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Department</label>
                    <select
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 outline-none"
                      value={students[idx].dept}
                      onChange={e => {
                        const c = [...students]; c[idx].dept = e.target.value; setStudents(c)
                      }}
                    >
                      <option value="">Select Dept</option>
                      <option>CSE</option><option>IT</option><option>ECE</option>
                      <option>EEE</option><option>MECH</option><option>CIVIL</option>
                      <option>AIDS</option><option>OTHER</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Year</label>
                    <input
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 outline-none"
                      placeholder="e.g. 2026"
                      value={students[idx].year}
                      onChange={e => {
                        const c = [...students]; c[idx].year = e.target.value; setStudents(c)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Email Address</label>
                    <input
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 outline-none"
                      placeholder="student@example.com"
                      value={students[idx].email}
                      onChange={e => {
                        const c = [...students]; c[idx].email = e.target.value; setStudents(c)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                    <input
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 outline-none"
                      placeholder="+91..."
                      value={students[idx].phone}
                      onChange={e => {
                        const c = [...students]; c[idx].phone = e.target.value; setStudents(c)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm bottom-8">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-2 px-6 py-3 text-red-600 font-bold hover:bg-red-100 rounded-xl transition-colors"
          >
            <Trash2 size={20} />
            Clear All
          </button>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              className="px-8 py-3 bg-yellow-300 text-gray-900 font-bold rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-green-700 hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50"
            >
              Submit for Review
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
