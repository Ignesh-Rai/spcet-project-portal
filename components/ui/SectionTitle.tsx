type SectionTitleProps = {
  title: React.ReactNode
  subtitle?: string
  align?: "center" | "left"
}

export default function SectionTitle({
  title,
  subtitle,
  align = "center",
}: SectionTitleProps) {
  return (
    <div className={`mb-10 text-${align}`}>
      <h2 className="text-3xl font-bold text-blue-800 mb-2">{title}</h2>
      {subtitle && <p className="text-gray-600 text-lg">{subtitle}</p>}
      <div
        className={`h-1 w-20 bg-yellow-400 mt-3 ${align === "center" ? "mx-auto" : ""
          } rounded-full`}
      ></div>
    </div>
  )
}
