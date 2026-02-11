import { HelpCircle, X } from "lucide-react";

interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

export default function ConfirmModal({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-gray-100 text-center animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 ${danger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <HelpCircle size={40} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">{message}</p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className={`w-full py-4 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'} text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]`}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
