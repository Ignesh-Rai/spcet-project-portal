import "./globals.css"
import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export const metadata: Metadata = {
  title: "SPCET - Project Portal",
  description: "Official project showcase portal of St.Peter's College of Engineering and Technology",
  icons: {
    icon: "favicon.png", // Path to logo in public folder
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
