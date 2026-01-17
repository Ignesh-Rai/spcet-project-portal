export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">{message}</p>
        </div>
    )
}
