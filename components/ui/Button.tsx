"use client"
import { motion } from "framer-motion"

type ButtonProps = {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "accent"
  onClick?: () => void
  type?: "button" | "submit"
  className?: string
}

export default function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const baseStyles =
    "px-5 py-2.5 rounded-lg font-medium focus:outline-none transition-colors duration-200"

  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    accent: "bg-yellow-400 text-gray-900 hover:bg-yellow-500",
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  )
}
