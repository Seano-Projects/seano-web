import React from "react";
import { X } from "lucide-react";

const WizardModal = ({
  isOpen,
  onClose,
  title,
  currentStep,
  totalSteps,
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm font-openSans sm:items-center sm:p-4">
      <div className="max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-gray-300 bg-white shadow-2xl dark:border-slate-600 dark:bg-black">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-600 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full bg-fourth transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-5 sm:max-h-none sm:p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-600 flex justify-between items-center bg-gray-50 dark:bg-black">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardModal;
