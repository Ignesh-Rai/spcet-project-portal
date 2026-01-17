import Navbar from "@/components/Navbar"

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
        </>
    )
}
