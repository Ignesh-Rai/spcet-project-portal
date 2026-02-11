import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface NotificationModalProps {
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

export default function NotificationModal({ open, title, message, type, onClose }: NotificationModalProps) {
    if (!open) return null;

    const colors = {
        success: "bg-green-50 text-green-700 border-green-100",
        error: "bg-red-50 text-red-700 border-red-100",
        info: "bg-blue-50 text-blue-700 border-blue-100",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-gray-100 text-center animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 ${colors[type]}`}>
                    {type === 'success' && <CheckCircle2 size={40} />}
                    {type === 'error' && <AlertCircle size={40} />}
                    {type === 'info' && <AlertCircle size={40} className="rotate-180" />}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">{message}</p>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-gray-200 active:scale-[0.98]"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
