type Props = {
  title: string
  description: string
}

export default function FeatureCard({ title, description }: Props) {
  return (
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:scale-105 transition">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-200">{description}</p>
    </div>
  )
}
