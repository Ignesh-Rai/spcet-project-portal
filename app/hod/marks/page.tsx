"use client"

import React, { useState, useEffect } from "react"
import { collection, onSnapshot, query } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    Download,
    FileText,
    FileSpreadsheet,
    Search,
    Users,
    Table,
    X,
    ClipboardList,
    ChevronDown,
    ChevronUp
} from "lucide-react"
import NotificationModal from "@/components/ui/NotificationModal"
import * as XLSX from "xlsx"

interface Student {
    name: string
    regNo: string
    dept?: string
}

interface ReviewData {
    studentMarks: Record<string, number>
    teamMarks: number
    totalMarks: number
}

interface Project {
    id: string
    title: string
    department?: string
    dept?: string
    students: Student[]
    reviewMarks?: Record<string, ReviewData>
    visibility: string
    facultyName?: string
}

export default function HoDMarksView() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [userDept, setUserDept] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [notification, setNotification] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        open: false,
        title: "",
        message: "",
        type: "info"
    })
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx')
    const [exportFilename, setExportFilename] = useState("")

    const router = useRouter()

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/auth/login")
                return
            }

            // Extract department from claims like in HoD Dashboard
            const token = await user.getIdTokenResult()
            const dept = token.claims.department as string

            if (!dept) {
                setNotification({
                    open: true,
                    title: "Access Restricted",
                    message: "No department found in your profile. Please contact admin.",
                    type: "error"
                })
                return
            }

            setUserDept(dept)

            const q = query(collection(db, "projects"))
            const unsubscribeProjects = onSnapshot(q, (snapshot) => {
                const allProjects = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Project))

                // Filter projects by department and non-draft status
                const filtered = allProjects.filter(p => {
                    const pDept = (p.department || p.dept || "").toUpperCase()
                    return pDept === dept.toUpperCase() && p.visibility !== 'draft'
                })

                setProjects(filtered)
                setLoading(false)
            })

            return () => unsubscribeProjects()
        })

        return () => unsubscribeAuth()
    }, [router])

    const filteredProjects = projects.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.students?.some(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.regNo?.includes(searchQuery))
    )

    const handleExport = () => {
        if (filteredProjects.length === 0) {
            setNotification({
                open: true,
                title: "No Data",
                message: "No projects available to export.",
                type: "info"
            })
            return
        }
        setExportFilename(`Project_Marks_${userDept}_${new Date().toLocaleDateString().replace(/\//g, '-')}`)
        setShowExportModal(true)
    }

    const processExport = () => {
        if (!exportFilename.trim()) return

        const data: any[][] = []
        const merges: any[] = []
        let currentRow = 1 // 1-indexed for XLSX merge logic

        // Headers
        const headers = [
            "Project Title",
            "Student Name",
            "Reg No",
            "Review 1 (Indiv)", "Review 1 (Team)", "Review 1 (Total)",
            "Review 2 (Indiv)", "Review 2 (Team)", "Review 2 (Total)",
            "Review 3 (Indiv)", "Review 3 (Team)", "Review 3 (Total)",
            "Review 4 (Indiv)", "Review 4 (Team)", "Review 4 (Total)",
            "Review 5 (Indiv)", "Review 5 (Team)", "Review 5 (Total)",
            "Review 6 (Indiv)", "Review 6 (Team)", "Review 6 (Total)"
        ]
        data.push(headers)
        currentRow++

        filteredProjects.forEach((proj) => {
            const students = proj.students?.filter(s => s.name?.trim()) || []
            if (students.length === 0) return

            const startRow = currentRow - 1 // 0-indexed for XLSX merge logic

            students.forEach((student, index) => {
                const row = [
                    proj.title || "Untitled",
                    student.name,
                    student.regNo
                ]

                for (let i = 1; i <= 6; i++) {
                    const marks = proj.reviewMarks?.[i] || { studentMarks: {}, teamMarks: 0, totalMarks: 0 }
                    row.push((marks.studentMarks[student.regNo] || 0).toString())
                    row.push((marks.teamMarks || 0).toString())
                    row.push((marks.totalMarks || 0).toString())
                }

                data.push(row)
                currentRow++
            })

            const endRow = currentRow - 2

            // Merge Project Title (Col A)
            if (endRow > startRow) {
                merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } })

                // Merge Team Marks and Total for each review?
                // The image shows Team Marks spanning rows.
                // Col D: Review 1 Indiv (distinct)
                // Col E: Review 1 Team (merged)
                // Col F: Review 1 Total (merged)
                for (let i = 0; i < 6; i++) {
                    const teamCol = 4 + (i * 3)
                    const totalCol = 5 + (i * 3)
                    merges.push({ s: { r: startRow, c: teamCol }, e: { r: endRow, c: teamCol } })
                    merges.push({ s: { r: startRow, c: totalCol }, e: { r: endRow, c: totalCol } })
                }
            }
        })

        if (exportFormat === 'xlsx') {
            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.aoa_to_sheet(data)
            ws['!merges'] = merges

            // Set some styles (XLSX basic)
            const range = XLSX.utils.decode_range(ws['!ref'] || "A1")
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!ws[cell_ref]) continue;

                    // Add alignment for merged cells
                    ws[cell_ref].s = {
                        alignment: { vertical: "center", horizontal: "center" },
                        border: {
                            top: { style: "thin" },
                            bottom: { style: "thin" },
                            left: { style: "thin" },
                            right: { style: "thin" }
                        }
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, "Project Marks")
            XLSX.writeFile(wb, `${exportFilename}.xlsx`)
        } else {
            // Simple CSV (doesn't support merges)
            let csv = data.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n")
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const link = document.createElement("a")
            const url = URL.createObjectURL(blob)
            link.setAttribute("href", url)
            link.setAttribute("download", `${exportFilename}.csv`)
            link.style.visibility = "hidden"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }

        setShowExportModal(false)
        setNotification({
            open: true,
            title: "Exported",
            message: `Department marks have been exported as ${exportFormat.toUpperCase()}.`,
            type: "success"
        })
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <Link
                            href="/hod/dashboard"
                            className="flex items-center gap-2 text-blue-600 font-semibold hover:underline mb-4"
                        >
                            <ArrowLeft size={16} /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                            <Table className="text-blue-600" size={32} /> Internal Review Marks
                        </h1>
                        <p className="text-gray-500 font-medium">Monitoring and exporting performance for {userDept} Department</p>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold uppercase tracking-wider hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 text-xs"
                    >
                        <Download size={14} />
                        <span>Export Marks</span>
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="relative mb-8 group">
                    <input
                        type="text"
                        placeholder="Search by title, student name or registration number..."
                        className="w-full pl-6 pr-14 py-4 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-900 placeholder:text-gray-400 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                        <Search className="text-gray-400 group-focus-within:text-blue-500 transition-all" size={20} />
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-3xl border border-gray-400 shadow-sm overflow-hidden mb-12 relative">
                    <div className="overflow-x-auto max-h-[850px]">
                        <table className="w-full border-separate border-spacing-0">
                            <thead className="sticky top-0 z-30">
                                <tr className="bg-gray-200 h-14">
                                    <th rowSpan={2} className="sticky left-0 top-0 z-[40] bg-gray-200 px-6 text-left text-xs font-bold text-gray-700 uppercase tracking-widest min-w-[250px] shadow-[inset_-1px_0_0_0_#9ca3af,inset_0_-2px_0_0_#9ca3af]">Project Details</th>
                                    <th rowSpan={2} className="sticky left-[250px] top-0 z-[40] bg-gray-200 px-6 text-left text-xs font-bold text-gray-700 uppercase tracking-widest min-w-[200px] shadow-[inset_-1px_0_0_0_#9ca3af,inset_0_-2px_0_0_#9ca3af]">Students</th>
                                    {[1, 2, 3, 4, 5, 6].map(r => (
                                        <th key={r} colSpan={3} className="sticky top-0 bg-gray-200 px-6 text-center text-[10px] font-bold text-blue-700 uppercase tracking-widest border-r border-b border-gray-400 shadow-[inset_0_-1px_0_0_#9ca3af]">
                                            Review {r}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-100 h-12">
                                    {[1, 2, 3, 4, 5, 6].map(r => (
                                        <React.Fragment key={r}>
                                            <th className="sticky top-14 bg-gray-100 px-4 text-center text-[8px] font-bold text-gray-500 uppercase border-r border-b border-gray-400 shadow-[inset_0_-1px_0_0_#9ca3af]">Ind.</th>
                                            <th className="sticky top-14 bg-gray-100 px-4 text-center text-[8px] font-bold text-gray-500 uppercase border-r border-b border-gray-400 shadow-[inset_0_-1px_0_0_#9ca3af]">Team</th>
                                            <th className="sticky top-14 bg-gray-100 px-4 text-center text-[8px] font-bold text-gray-500 uppercase border-r border-b border-gray-400 shadow-[inset_0_-1px_0_0_#9ca3af]">Total</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={20} className="px-6 py-20 text-center bg-white">
                                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-gray-500 font-bold">Loading departmental data...</p>
                                        </td>
                                    </tr>
                                ) : filteredProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={20} className="px-6 py-20 text-center bg-white">
                                            <ClipboardList size={48} className="text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-500 font-bold uppercase tracking-widest">No matching records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProjects.map((project) => {
                                        const projectStudents = project.students?.filter(s => s.name?.trim()) || []
                                        return projectStudents.map((student, sIdx) => (
                                            <tr key={`${project.id}-${student.regNo}`} className="hover:bg-blue-50/10 transition-colors group">
                                                {sIdx === 0 && (
                                                    <td rowSpan={projectStudents.length} className="sticky left-0 z-20 bg-white px-6 py-4 align-top min-w-[250px] shadow-[inset_-1px_0_0_0_#9ca3af,inset_0_-1px_0_0_#9ca3af,2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                        <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight mb-1">{project.title}</p>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded-md">{project.visibility}</span>
                                                    </td>
                                                )}
                                                <td className="sticky left-[250px] z-20 bg-white px-6 py-4 min-w-[200px] shadow-[inset_-1px_0_0_0_#9ca3af,inset_0_-1px_0_0_#9ca3af,2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">{student.regNo}</p>
                                                </td>
                                                {[1, 2, 3, 4, 5, 6].map(r => {
                                                    const marks = project.reviewMarks?.[r] || { studentMarks: {}, teamMarks: 0, totalMarks: 0 }
                                                    const studentMark = marks.studentMarks[student.regNo] || 0
                                                    return (
                                                        <React.Fragment key={r}>
                                                            <td className="px-4 py-4 text-center border-r border-b border-gray-400 bg-white">
                                                                <span className="text-sm font-medium text-gray-700">{studentMark}</span>
                                                            </td>
                                                            {sIdx === 0 ? (
                                                                <td rowSpan={projectStudents.length} className="px-4 py-4 text-center border-r border-b border-gray-400 bg-gray-50/50">
                                                                    <span className="text-sm font-bold text-blue-600">{marks.teamMarks || 0}</span>
                                                                </td>
                                                            ) : null}
                                                            {sIdx === 0 ? (
                                                                <td rowSpan={projectStudents.length} className="px-4 py-4 text-center border-r border-b border-gray-400 bg-blue-50/30">
                                                                    <span className="text-sm font-black text-blue-700">{marks.totalMarks || 0}</span>
                                                                </td>
                                                            ) : null}
                                                        </React.Fragment>
                                                    )
                                                })}
                                            </tr>
                                        ))
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowExportModal(false)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                            <Download size={32} />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-2 uppercase tracking-tight">Export Marks</h2>
                        <p className="text-gray-500 mb-6 font-medium">Configure your departmental export settings below.</p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Filename</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900 font-semibold"
                                    value={exportFilename}
                                    onChange={(e) => setExportFilename(e.target.value)}
                                    placeholder="Enter filename..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Export Format</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setExportFormat('xlsx')}
                                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold uppercase tracking-widest text-xs ${exportFormat === 'xlsx'
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100"
                                            : "bg-white text-gray-500 border-gray-100 hover:border-emerald-200"
                                            }`}
                                    >
                                        <FileSpreadsheet size={18} />
                                        Excel Format
                                    </button>
                                    <button
                                        onClick={() => setExportFormat('csv')}
                                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all font-bold uppercase tracking-widest text-xs ${exportFormat === 'csv'
                                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-100"
                                            : "bg-white text-gray-500 border-gray-100 hover:border-slate-200"
                                            }`}
                                    >
                                        <FileText size={18} />
                                        CSV Format
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={processExport}
                                    className="w-full py-4 bg-gray-900 text-white font-bold uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]"
                                >
                                    Confirm & Export
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
