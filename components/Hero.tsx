import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20 text-center">
      <h1 className="text-lg text-black-700 mb-2">
        Welcome to
      </h1>
      <h2 className="text-4xl md:text-5xl font-bold mb-4">
        St. Peter&apos;s College of Engineering and Technology Students Project Portal
      </h2>
      <p className="text-lg max-w-2xl mx-auto mb-6">
        Explore innovative projects from students of St. Peter&apos;s College of Engineering and Technology, discover creativity, and get inspired by technology-driven solutions.
      </p>
      <Link
        href="/explorer"
        className="px-6 py-3 bg-white text-purple-700 rounded-lg font-medium hover:bg-gray-200 transition"
      >
        Explore Projects
      </Link>
    </section>
  )
}
