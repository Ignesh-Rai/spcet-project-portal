import Navbar from "@/components/Navbar"

export default function HoDLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
        </>
    )
}
