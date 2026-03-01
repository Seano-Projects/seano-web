import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiXCircle,
  FiX,
} from "react-icons/fi";

const listeners = new Set();

const baseToast = ({
  title,
  description,
  variant = "default",
  duration = 4000,
  actionLabel,
  onAction,
  id,
}) => ({
  id: id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  title,
  description,
  variant,
  duration,
  actionLabel,
  onAction,
});

const emit = (toast) => {
  listeners.forEach((listener) => listener(toast));
};

export const toast = {
  show: (options) => emit(baseToast(options)),
  success: (message, opts = {}) =>
    emit(
      baseToast({
        title: opts.title ?? "Success",
        description: opts.description ?? message,
        variant: "success",
        ...opts,
      }),
    ),
  error: (message, opts = {}) =>
    emit(
      baseToast({
        title: opts.title ?? "Error",
        description: opts.description ?? message,
        variant: "error",
        ...opts,
      }),
    ),
  info: (message, opts = {}) =>
    emit(
      baseToast({
        title: opts.title ?? "Information",
        description: opts.description ?? message,
        variant: "info",
        ...opts,
      }),
    ),
  warning: (message, opts = {}) =>
    emit(
      baseToast({
        title: opts.title ?? "Warning",
        description: opts.description ?? message,
        variant: "warning",
        ...opts,
      }),
    ),
};

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (nextToast) => {
      setToasts((prev) => [...prev, nextToast]);
      if (nextToast.duration !== Infinity) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== nextToast.id));
        }, nextToast.duration);
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const remove = (id) =>
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== id));

  const value = useMemo(() => ({ remove }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[99999] flex flex-col items-end px-2 py-4 sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto">
          <AnimatePresence mode="popLayout">
            {toasts.map((toastItem) => (
              <ToastCard
                key={toastItem.id}
                toastItem={toastItem}
                onClose={remove}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
};

// Base style - same for all variants (black/white based on dark mode)
const baseStyle =
  "bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 shadow-lg";

const variantIconColor = {
  default: "text-gray-600 dark:text-gray-400",
  success: "text-emerald-600 dark:text-emerald-500",
  error: "text-rose-600 dark:text-rose-500",
  warning: "text-amber-600 dark:text-amber-500",
  info: "text-blue-600 dark:text-blue-500",
};

const variantIcon = {
  default: null,
  success: <FiCheckCircle className="h-5 w-5" />,
  error: <FiXCircle className="h-5 w-5" />,
  warning: <FiAlertTriangle className="h-5 w-5" />,
  info: <FiInfo className="h-5 w-5" />,
};

const ToastCard = ({ toastItem, onClose }) => {
  const { id, title, description, variant, actionLabel, onAction } = toastItem;
  const icon = variantIcon[variant] ?? variantIcon.default;
  const iconColor = variantIconColor[variant] ?? variantIconColor.default;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      className={`pointer-events-auto flex w-full flex-row items-start gap-3 rounded-xl p-4 transition-all duration-200 ease-out sm:w-96 ${baseStyle} font-openSans`}
    >
      {icon && (
        <span
          className={`mt-0.5 flex h-6 w-6 items-center justify-center flex-shrink-0 ${iconColor}`}
        >
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold leading-tight">{title}</p>
        )}
        {description && (
          <p className="mt-1 text-sm leading-snug opacity-80">{description}</p>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={() => {
              onAction();
              onClose(id);
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-white ring-1 ring-gray-200 dark:ring-gray-700 transition hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="mt-0.5 rounded-md p-1 text-current opacity-70 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex-shrink-0"
      >
        <FiX className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export const useToast = () => useContext(ToastContext);

export default toast;
