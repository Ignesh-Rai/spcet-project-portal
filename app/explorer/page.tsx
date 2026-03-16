"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Medal, Grid, Search, FlaskConical, ArrowLeft, ArrowRight } from "lucide-react"

// ✅ IMPORT FIRESTORE FUNCTIONS
import {
  subscribeToPublicProjects,
} from "@/lib/db/projects"

const departments = ["All", "CSE", "IT", "AIDS", "CSBS", "ECE", "EEE", "Biotech", "Mech", "Civil", "Chemical", "MBA"]
const types = ["All", "College Project", "Product", "Publication"]

function ExplorerContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("search") || ""

  const initialDeptRaw = searchParams.get("dept") || "All"
  const initialDept = departments.find(d => d.toLowerCase() === initialDeptRaw.toLowerCase()) || "All"

  const initialTypeRaw = searchParams.get("type") || "All"
  const initialType = types.find(t => t.toLowerCase() === initialTypeRaw.toLowerCase()) || "All"

  const initialTech = searchParams.get("tech") || "All"

  const [projects, setProjects] = useState<any[]>([])
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedDept, setSelectedDept] = useState(initialDept)
  const [selectedType, setSelectedType] = useState(initialType)
  const [selectedTech, setSelectedTech] = useState(initialTech)
  const [showFilters, setShowFilters] = useState(
    initialDept !== "All" || initialType !== "All" || initialTech !== "All"
  )

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const PROJECTS_PER_PAGE = 9

  // -------------------------------------------------------------
  //  REAL-TIME FIRESTORE FETCH
  // -------------------------------------------------------------
  useEffect(() => {
    setLoading(true)

    const unsub = subscribeToPublicProjects((items, last) => {
      const formatted = items.map((p: any, idx: number) => ({
        id: p.id ?? idx,
        title: p.title ?? "Untitled Project",
        dept: p.dept ?? p.department ?? "Unknown",
        year:
          p.year ??
          (p.createdAt?.toDate
            ? p.createdAt.toDate().getFullYear()
            : new Date().getFullYear()),
        type: p.type ?? p.projectType ?? "Project",
        tech: p.technologies ?? p.tech ?? [],
        hallOfFame: !!p.hallOfFame,
        ...p,
      }))

      setProjects(formatted)
      setLastDoc(last)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // -------------------------------------------------------------
  // 🔎 FILTER LOGIC
  // -------------------------------------------------------------
  const filteredProjects = projects.filter((p) => {
    const query = searchQuery.toLowerCase().trim()
    const deptCodes = ["cse", "it", "aids", "csbs", "ece", "eee", "biotech", "mech", "civil", "chemical", "mba"]

    // If search query is a department code, use whole-word matching to avoid false positives like "it" in "circuit"
    const isDeptQuery = deptCodes.includes(query)

    const matchesSearch =
      query === "" ||
      (isDeptQuery
        ? new RegExp(`\\b${query}\\b`, 'i').test(p.title)
        : p.title.toLowerCase().includes(query)) ||
      (isDeptQuery
        ? p.dept.toLowerCase() === query
        : p.dept.toLowerCase().includes(query)) ||
      (p.tech && p.tech.some((t: string) =>
        isDeptQuery
          ? new RegExp(`\\b${query}\\b`, 'i').test(t)
          : t.toLowerCase().includes(query)
      ))

    const matchesDept = selectedDept === "All" || p.dept.toLowerCase() === selectedDept.toLowerCase()
    const matchesType = selectedType === "All" || p.type === selectedType
    const matchesTech = selectedTech === "All" || p.tech.includes(selectedTech)

    return matchesSearch && matchesDept && matchesType && matchesTech
  })

  const technologies = [
    "All",
    ...new Set(projects.flatMap((p) => p.tech || [])),
  ]

  // Page-based pagination
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  )

  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedDept, selectedType, selectedTech])

  // -------------------------------------------------------------
  // UI STARTS
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 pt-10 px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold flex items-center text-blue-900 gap-3">
          <FlaskConical className="text-blue-600" />
          Explore Student Innovations
        </h1>
        <p className="text-gray-600 mt-2">
          Discover projects, real-time applications, research works, and more!
        </p>

        {/* 🔍 Search Bar */}
        <div className="mt-8 flex gap-2 w-full">
          <input
            type="text"
            placeholder="Search by project title, department, or technology..."
            className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="bg-slate-700 text-white p-3 rounded-lg hover:bg-slate-800 transition shadow-sm flex items-center justify-center">
            <Search size={24} />
          </button>
        </div>

        {/* 🔽 Filters Toggle */}
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        {/* 🧩 Filters Section */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 mt-4 rounded-lg shadow">
            <div>
              <label className="text-gray-800 font-medium">Department</label>
              <select
                className="w-full p-2 border rounded-lg mt-1 text-gray-900"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-800 font-semibold">Project Type</label>
              <select
                className="w-full p-2 border rounded-lg mt-1 text-gray-900"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-800 font-semibold">Technology</label>
              <select
                className="w-full p-2 border rounded-lg mt-1 text-gray-900"
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
              >
                {technologies.map((tech) => (
                  <option key={tech}>{tech}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ⭐ Hall of Fame */}
        {filteredProjects.some(p => p.hallOfFame) && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              <Medal className="text-yellow-500 w-8 h-8" />
              Hall of Fame
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {filteredProjects
                .filter((p) => p.hallOfFame)
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/explorer/${p.id}`}
                    className="bg-yellow-50/30 border-l-5 border-yellow-500 p-4 pb-3 rounded-lg shadow-sm hover:shadow-md transition block border border-yellow-100"
                  >
                    <div className="flex flex-col justify-between h-full">
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{p.title}</h3>

                      <div className="flex justify-between items-end mt-4 pt-2 border-t border-yellow-200/50">
                        <div>
                          <p className="text-yellow-700 font-bold text-sm">{p.dept}</p>
                          <p className="text-[10px] text-yellow-600 font-medium">{p.year}</p>
                        </div>

                        {/* Students Avatars in Hall of Fame (Right Bottom) */}
                        <div className="flex -space-x-2">
                          {p.students?.slice(0, 3).map((s: any, i: number) => (
                            <div
                              key={i}
                              title={s.name}
                              className="w-6 h-6 rounded-full bg-yellow-100 border-1 border-yellow-200 flex items-center justify-center text-[10px] font-black text-yellow-700 shadow-sm"
                            >
                              {s.name?.charAt(0) || "S"}
                            </div>
                          ))}
                          {p.students?.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-yellow-50 border-1 border-yellow-200 flex items-center justify-center text-[10px] font-bold text-yellow-600 shadow-sm">
                              +{p.students.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* 🔥 Projects Grid */}
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2 text-gray-900">
          <Grid className="w-6 h-6 text-blue-600" />
          All Projects
        </h2>
        {loading && <p className="text-gray-600 mt-4">Loading...</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {paginatedProjects.map((p) => (
            <Link
              key={p.id}
              href={`/explorer/${p.id}`}
              className="bg-white p-4 pb-3 rounded-lg shadow hover:shadow-lg transition flex flex-col justify-between border border-blue-300"
            >
              <div>
                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{p.title}</h3>
                <p className="text-blue-600 font-semibold text-sm mt-0.5">{p.dept}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.year}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {p.tech.slice(0, 3).map((t: string) => (
                  <span
                    key={t}
                    className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100"
                  >
                    {t}
                  </span>
                ))}
                {p.tech.length > 3 && (
                  <span className="text-[10px] font-bold text-blue-400 ml-1">+{p.tech.length - 3}</span>
                )}
              </div>

              {/* Students (Right Bottom) */}
              <div className="mt-2 pt-2 border-t border-gray-50 flex justify-end">
                <div className="flex -space-x-2">
                  {p.students?.slice(0, 3).map((s: any, i: number) => (
                    <div
                      key={i}
                      title={s.name}
                      className="w-6 h-6 rounded-full bg-gray-100 border-2 border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm"
                    >
                      {s.name?.charAt(0) || "S"}
                    </div>
                  ))}
                  {p.students?.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm">
                      +{p.students.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ❌ No Projects Found State */}
        {!loading && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 mt-10">
            <div className="bg-gray-50 p-6 rounded-full mb-4">
              <Search className="text-gray-300 w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Projects Found</h3>
            <p className="text-gray-500 mt-2 max-w-xs text-center">
              We couldn't find any projects matching your search or filters. Try adjusting your query or filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDept("All");
                setSelectedType("All");
                setSelectedTech("All");
              }}
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* 📌 Pagination Controls */}
        {filteredProjects.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-3 bg-white border border-gray-300 rounded-xl text-gray-600 disabled:opacity-30 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm flex items-center justify-center"
              title="Previous Page"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="px-6 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-sm border border-blue-100">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-3 bg-white border border-gray-300 rounded-xl text-gray-600 disabled:opacity-30 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm flex items-center justify-center"
              title="Next Page"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Explorer...</div>}>
      <ExplorerContent />
    </Suspense>
  )
}
