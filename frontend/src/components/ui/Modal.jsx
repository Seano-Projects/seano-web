import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  size = "md",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10); // Small delay to trigger animation
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300); // Wait for animation to complete
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const sizeClasses = {
    sm: "w-full max-w-sm sm:w-80",
    md: "w-full max-w-md sm:w-96",
    lg: "w-full max-w-lg sm:w-[32rem]",
    xl: "w-full max-w-4xl sm:w-[48rem]",
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className={`fixed inset-0 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm transition-opacity duration-300 ease-out sm:items-center sm:p-4 font-openSans ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={`max-h-[min(100dvh-1.5rem,44rem)] overflow-y-auto bg-white dark:bg-black border-2 border-gray-300 dark:border-slate-600 rounded-2xl p-5 sm:p-6 ${
          sizeClasses[size]
        } shadow-2xl ${className} transition-all duration-300 ease-out transform ${
          isAnimating
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h3
              id="modal-title"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="text-gray-900 dark:text-white">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default Modal;
