"use client"

import React, { useState, useEffect } from "react"
import { Save, ClipboardList, User, Users, Calculator, ChevronRight, ChevronDown } from "lucide-react"
import { updateProjectMarks } from "@/lib/db/projects"
import NotificationModal from "./ui/NotificationModal"

interface Student {
    name: string
    regNo: string
    dept?: string
    year?: string | number
}

interface ReviewData {
    studentMarks: Record<string, number>
    teamMarks: number
    totalMarks: number
}

interface ReviewMarksProps {
    projectId: string
    students: Student[]
    existingMarks?: Record<string, ReviewData>
    canEdit: boolean
}

export default function ReviewMarks({ projectId, students, existingMarks, canEdit }: ReviewMarksProps) {
    const [marks, setMarks] = useState<Record<string, ReviewData>>(existingMarks || {})
    const [activeReview, setActiveReview] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [expanded, setExpanded] = useState(true)
    const [notification, setNotification] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        open: false,
        title: "",
        message: "",
        type: "info"
    })

    const reviews = [1, 2, 3, 4, 5, 6]

    useEffect(() => {
        if (existingMarks) {
            setMarks(existingMarks)
        }
    }, [existingMarks])

    const handleMarkChange = (reviewNo: number, regNo: string, value: string) => {
        const numValue = parseFloat(value) || 0
        const currentReview = marks[reviewNo] || { studentMarks: {}, teamMarks: 0, totalMarks: 0 }

        const newStudentMarks = { ...currentReview.studentMarks, [regNo]: numValue }
        const newTotal = Object.values(newStudentMarks).reduce((a, b) => a + b, 0) + currentReview.teamMarks

        setMarks({
            ...marks,
            [reviewNo]: {
                ...currentReview,
                studentMarks: newStudentMarks,
                totalMarks: newTotal
            }
        })
    }

    const handleTeamMarkChange = (reviewNo: number, value: string) => {
        const numValue = parseFloat(value) || 0
        const currentReview = marks[reviewNo] || { studentMarks: {}, teamMarks: 0, totalMarks: 0 }

        const newTotal = (Object.values(currentReview.studentMarks).reduce((a: any, b: any) => a + b, 0) as number) + numValue

        setMarks({
            ...marks,
            [reviewNo]: {
                ...currentReview,
                teamMarks: numValue,
                totalMarks: newTotal
            }
        })
    }

    const saveMarks = async () => {
        setIsSaving(true)
        try {
            await updateProjectMarks(projectId, marks)
            setNotification({
                open: true,
                title: "Success",
                message: "Marks have been saved successfully to the system.",
                type: "success"
            })
        } catch (err) {
            console.error(err)
            setNotification({
                open: true,
                title: "Error",
                message: "There was a problem saving the marks. Please check your connection and try again.",
                type: "error"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const currentReviewData = marks[activeReview] || { studentMarks: {}, teamMarks: 0, totalMarks: 0 }

    return (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8">
            <div
                className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <ClipboardList className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Project Review Marks</h3>
                </div>
                {expanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
            </div>

            {expanded && (
                <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-6">
                        {reviews.map((r) => (
                            <button
                                key={r}
                                onClick={() => setActiveReview(r)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeReview === r
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}
                            >
                                Review {r}
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <Users size={18} className="text-blue-500" /> Mark Entry for Review {activeReview}
                            </h4>
                            <div className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-black uppercase tracking-wider">
                                Internal Usage Only
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <th className="px-4 py-3">Student Details</th>
                                        <th className="px-4 py-3 text-right">Individual Marks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {students.filter(s => s.name?.trim()).map((student, i) => (
                                        <tr key={student.regNo || i} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-white transition-colors">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{student.name}</p>
                                                        <p className="text-[10px] font-medium text-gray-400">{student.regNo}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <input
                                                    type="number"
                                                    disabled={!canEdit}
                                                    value={currentReviewData.studentMarks[student.regNo] || ""}
                                                    onChange={(e) => handleMarkChange(activeReview, student.regNo, e.target.value)}
                                                    className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-right font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
                                                    placeholder="0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-50/50">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <Users size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-blue-900">Team Marks</p>
                                                    <p className="text-[10px] font-medium text-blue-400">Common for all members</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <input
                                                type="number"
                                                disabled={!canEdit}
                                                value={currentReviewData.teamMarks || ""}
                                                onChange={(e) => handleTeamMarkChange(activeReview, e.target.value)}
                                                className="w-24 px-3 py-2 bg-white border border-blue-200 rounded-lg text-right font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                    <tr className="bg-blue-600 text-white">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                                                    <Calculator size={14} />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-wider">Total Marks</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-xl font-black">{currentReviewData.totalMarks || 0}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {canEdit && (
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={saveMarks}
                                    disabled={isSaving}
                                    className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    <span>{isSaving ? "Saving..." : "Save Marks"}</span>
                                </button>
                            </div>
                        )}
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
        </section>
    )
}
