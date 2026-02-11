import { Key, X } from "lucide-react";
import { useState } from "react";

interface InputModalProps {
    open: boolean;
    title: string;
    message: string;
    placeholder: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
    submitText?: string;
    type?: string;
}

export default function InputModal({
    open,
    title,
    message,
    placeholder,
    onSubmit,
    onCancel,
    submitText = "Submit",
    type = "text"
}: InputModalProps) {
    const [value, setValue] = useState("");

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSubmit(value);
            setValue("");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-gray-100 text-center animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 bg-blue-50 text-blue-600">
                    <Key size={40} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-500 mb-6 leading-relaxed">{message}</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type={type}
                        autoFocus
                        required
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900"
                    />
                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                        >
                            {submitText}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
