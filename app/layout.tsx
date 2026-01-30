import "./globals.css"
import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "SPCET Project Portal - St. Peter's College of Engineering and Technology",
  description: "Official project showcase and repository of St. Peter's College of Engineering and Technology (SPCET). Explore innovative engineering projects from CSE, IT, ECE, and CHEM departments.",
  keywords: ["SPCET", "Project Portal", "St. Peter's College of Engineering", "Engineering Projects", "CSE Projects", "IT Projects", "Avadi", "Chennai", "Anna University Affiliated College"],
  authors: [{ name: "SPCET" }],
  robots: "index, follow",
  icons: {
    icon: "/favicon.png", // static asset
  },
  openGraph: {
    title: "SPCET Project Portal",
    description: "Official project showcase portal of St. Peter's College of Engineering and Technology",
    url: "https://spcet-project-portal-v9q7.vercel.app/",
    siteName: "SPCET Project Portal",
    locale: "en_US",
    type: "website",
  },
  verification: {
    google: "uwgjS4XetDPrDqwcIlERYtvmIf_wNl_khBIJ5wn37d8",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* College Branding */}
        <Navbar />
        <main className="flex-grow pt-18">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
