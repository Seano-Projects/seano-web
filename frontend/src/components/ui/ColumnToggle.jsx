import { useEffect, useRef, useState } from "react";
import { FaColumns } from "react-icons/fa";

/**
 * ColumnToggle — reusable dropdown to show/hide table columns.
 *
 * Props:
 *   allKeys       {string[]}          Ordered list of all column keys.
 *   labels        {Record<string,string>} Display label for each key.
 *   visibleKeys   {Set<string>}       Currently visible column keys (controlled).
 *   onToggle      {(key: string) => void} Called when a key is checked/unchecked.
 *   onReset       {() => void}        Called when Reset button is clicked.
 *   maxColumns    {number}            Max allowed visible columns (default 6).
 *   title         {string}            Dropdown header label (default "Toggle Columns").
 *   resetLabel    {string}            Reset button label (default "Reset").
 *   maxLabel      {string}            Warning shown when cap is reached
 *                                     (default "Maksimum {max} kolom tercapai").
 */
const ColumnToggle = ({
  allKeys,
  labels,
  visibleKeys,
  onToggle,
  onReset,
  maxColumns = 6,
  title = "Toggle Columns",
  resetLabel = "Reset",
  maxLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const atMax = visibleKeys.size >= maxColumns;
  const defaultMaxLabel = `Maksimum ${maxColumns} kolom tercapai`;

  return (
    <div className="flex justify-end mb-3">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-transparent px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <FaColumns className="text-gray-500 dark:text-gray-400" />
          Columns
          <span
            className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
              atMax
                ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
            }`}
          >
            {visibleKeys.size}/{maxColumns}
          </span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-black shadow-lg">
            <div className="border-b border-gray-200 dark:border-slate-600 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {title}
                </span>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  {resetLabel}
                </button>
              </div>
              {atMax && (
                <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                  {maxLabel ?? defaultMaxLabel}
                </p>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
              {allKeys.map((key) => {
                const isChecked = visibleKeys.has(key);
                const isDisabled = !isChecked && atMax;
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${
                      isDisabled
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900"
                    } text-gray-700 dark:text-gray-200`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => onToggle(key)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    {labels[key]}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnToggle;
