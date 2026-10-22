import { useEffect } from "react";

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "max-w-lg",
}) {
    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "auto";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full ${size} max-h-[90vh] overflow-hidden animate-[fadeIn_.25s_ease]`}
            >
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b bg-white">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {title}
                    </h2>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5 text-slate-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {children}
                </div>
            </div>
        </div>
    );
}