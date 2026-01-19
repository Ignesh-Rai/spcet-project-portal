"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import Button from "@/components/ui/Button"
import SectionTitle from "@/components/ui/SectionTitle"
import Card from "@/components/ui/Card"
import { Rocket, Trophy, Sparkles, ArrowRight } from "lucide-react"

import {
  subscribeToPublicProjects,
  subscribeToHallOfFameProjects,
} from "@/lib/db/projects"

export default function Home() {
  const [hallOfFameProjects, setHallOfFameProjects] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // 1. Subscribe to Hall of Fame
    const unsubHOF = subscribeToHallOfFameProjects((items) => {
      // Normalize data for display
      const mapped = items.map((p) => ({
        id: p.id,
        title: p.title,
        dept: p.department || p.dept || "Gen",
        year: p.academicYear || (p.createdAt?.toDate?.().getFullYear() ?? new Date().getFullYear()),
      }))
      setHallOfFameProjects(mapped)
    })

    // 2. Subscribe to Recent Projects (Limit 4)
    const unsubRecent = subscribeToPublicProjects((items) => {
      const mapped = items.map((p) => ({
        id: p.id,
        title: p.title,
        dept: p.department || p.dept || "Gen",
        year: p.academicYear || (p.createdAt?.toDate?.().getFullYear() ?? new Date().getFullYear()),
      }))
      setRecentProjects(mapped)
    }, 4)

    return () => {
      unsubHOF()
      unsubRecent()
    }
  }, [])

  // Carousel Auto-Scroll
  useEffect(() => {
    if (hallOfFameProjects.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % hallOfFameProjects.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [hallOfFameProjects.length])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* ===== Hero Section ===== */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-24 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4 leading-snug">
          Welcome to <br />
          <span className="text-yellow-300">
            St. Peter&apos;s College of Engineering and Technology
          </span>
        </h1>
        <p className="text-lg mb-8 opacity-90">
          Showcasing Innovation and Excellence through Student Projects <Rocket className="inline-block ml-2 text-yellow-300" size={24} />
        </p>
        <Link href="/explorer">
          <Button variant="accent">Explore Projects</Button>
        </Link>
      </section>

      {/* ===== Search & Explore Section ===== */}
      <section className="py-12 text-center px-6">
        <SectionTitle
          title="Discover Amazing Projects"
          subtitle="Search and explore projects from various departments and technologies."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const query = (e.currentTarget.elements.namedItem('search') as HTMLInputElement).value;
            window.location.href = `/explorer?search=${encodeURIComponent(query)}`;
          }}
          className="max-w-2xl mx-auto flex gap-2"
        >
          <input
            name="search"
            type="text"
            placeholder="Search by title, department, or technology..."
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <Button type="submit" variant="primary">Search</Button>
        </form>
        <div className="mt-6">
          <Link
            href="/explorer"
            className="text-blue-600 hover:underline font-medium flex items-center justify-center gap-1"
          >
            View All Projects <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ===== Hall of Fame Section ===== */}
      <section className="py-14 bg-white border-t border-gray-200 text-center">
        <SectionTitle
          title={<span className="flex items-center justify-center gap-2"><Trophy className="text-yellow-500" size={28} /> Hall of Fame</span>}
          subtitle="Projects that achieved outstanding recognition and innovation."
        />
        <div className="relative w-full overflow-hidden max-w-5xl mx-auto">
          <div
            className="flex transition-transform duration-700"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {hallOfFameProjects.map((proj) => (
              <div key={proj.id} className="w-full flex-shrink-0 px-6 sm:px-12">
                <Link href={`/explorer/${proj.id}`}>
                  <Card className="bg-yellow-50/50 text-center border-yellow-500 border-1">
                    <h3 className="text-xl font-bold mb-2 text-blue-800">
                      {proj.title}
                    </h3>
                    <p className="text-gray-700 font-medium">
                      {proj.dept} Department — {proj.year}
                    </p>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Quick Filters Section ===== */}
      <section className="py-12 bg-gray-50 text-center">
        <SectionTitle
          title="Explore by Category"
          subtitle="Browse projects by departments and trending technologies."
        />
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto px-6">
          {[
            { label: "CSE", type: "dept" },
            { label: "IT", type: "dept" },
            { label: "ECE", type: "dept" },
            { label: "EEE", type: "dept" },
            { label: "MECH", type: "dept" },
            { label: "CIVIL", type: "dept" },
            { label: "AIML", type: "tech" },
            { label: "IoT", type: "tech" },
            { label: "Web Dev", type: "tech" },
          ].map((tag) => (
            <Link
              key={tag.label}
              href={`/explorer?${tag.type === "dept" ? "dept" : "search"}=${encodeURIComponent(tag.label)}`}
              className="px-6 py-2 bg-blue-100 text-blue-700 rounded-full font-bold cursor-pointer hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-200"
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Recent Projects Section ===== */}
      <section className="py-14 bg-white border-t border-gray-200">
        <SectionTitle
          title={<span className="flex items-center justify-center gap-2"><Sparkles className="text-blue-500" size={28} /> Recent Projects</span>}
          subtitle="Newest additions submitted and approved by faculty."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto px-6">
          {recentProjects.map((proj) => (
            <Card key={proj.id}>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {proj.title}
              </h3>
              <p className="text-sm text-gray-600">
                {proj.dept} Department — {proj.year}
              </p>
              <Link
                href={`/explorer/${proj.id}`}
                className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
              >
                View Details <ArrowRight size={16} />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== About Section ===== */}
      <section className="py-16 bg-blue-50 border-t border-gray-200 text-center">
        <SectionTitle
          title="About This Portal"
          subtitle="An initiative by St. Peter's College of Engineering and Technology."
        />
        <p className="max-w-3xl mx-auto text-gray-700 leading-relaxed mb-6">
          The <strong>Student Project Showcase Portal</strong> is an initiative
          by <strong>St. Peter&apos;s College of Engineering and Technology</strong> to
          highlight student innovations, encourage technical creativity, and
          provide a platform for collaboration between students, faculty, and
          industry professionals.
        </p>
        <Link href="/explorer">
          <Button variant="primary">Start Exploring</Button>
        </Link>
      </section>
    </div>
  )
}
