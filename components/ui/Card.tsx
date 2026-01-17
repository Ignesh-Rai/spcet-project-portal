"use client"
import { motion } from "framer-motion"

export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-all duration-200 ${className}`}
    >
      {children}
    </motion.div>
  )
}
