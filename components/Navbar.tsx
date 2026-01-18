"use client"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, LogOut } from "lucide-react"
import { onAuthStateChanged, signOut, User } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult()
          setRole(tokenResult.claims.role as string || null)
        } catch (error) {
          console.error("Error getting user role:", error)
          setRole(null)
        }
      } else {
        setRole(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // Dynamic navigation links based on auth state
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/explorer" },
    ...(role === "faculty" ? [{ name: "Dashboard", path: "/faculty/dashboard" }] : []),
    ...(role === "hod" ? [{ name: "Dashboard", path: "/hod/dashboard" }] : []),
    ...(role === "admin" ? [{ name: "Dashboard", path: "/admin/dashboard" }] : []),
    ...(user ? [] : [
      { name: "Login", path: "/login" }
    ])
  ]

  const handleLogout = async () => {
    try {
      // 1. Clear session cookie via API
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // 2. Start navigation away from protected pages
      router.push("/")

      // 3. Actually sign out from Firebase
      await signOut(auth)

      setMenuOpen(false)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-md border-b border-gray-200">
      <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-7xl mx-auto">

        {/* College Logo + Name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-80 transition flex items-center shrink-0">
            <Image
              src="/College-logo.png"
              alt="SPCET Logo"
              width={45}
              height={45}
              className="rounded-md"
            />
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-blue-700 leading-tight">
            St. Peter&apos;s College of Engineering and Technology
          </h1>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-8 text-gray-700 font-medium items-center">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={`hover:text-blue-600 transition ${pathname === link.path ? "text-blue-600 font-semibold" : ""
                }`}
            >
              {link.name}
            </Link>
          ))}

          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Menu"
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-md">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              onClick={() => setMenuOpen(false)}
              className={`block px-6 py-3 text-gray-700 hover:bg-gray-100 ${pathname === link.path ? "text-blue-600 font-semibold" : ""
                }`}
            >
              {link.name}
            </Link>
          ))}

          {user && (
            <button
              onClick={() => {
                setMenuOpen(false)
                handleLogout()
              }}
              className="w-full text-left px-6 py-3 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
