import React from "react";

const TableRowSkeleton = ({ columns = 5, hasCheckbox = true, hasActions = true, hasAvatar = false }) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors animate-pulse">
      {/* Checkbox column */}
      {hasCheckbox && (
        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-800 rounded"></div>
        </td>
      )}

      {/* Dynamic columns */}
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          {idx === 0 ? (
            // First column - with or without avatar
            hasAvatar ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-full"></div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-800 rounded w-16"></div>
                </div>
              </div>
            ) : (
              <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
            )
          ) : idx === columns - 1 && hasActions ? (
            // Last column with actions
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-lg"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-lg"></div>
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-lg"></div>
            </div>
          ) : (
            // Regular column
            <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-20"></div>
          )}
        </td>
      ))}
    </tr>
  );
};

export default TableRowSkeleton;

