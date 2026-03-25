import React from "react";

const DataTableSkeleton = ({ rows = 5, columns = [] }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr
          key={idx}
          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors animate-pulse"
        >
          {columns.map((column, colIndex) => {
            // Checkbox column
            if (colIndex === 0) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="w-4 h-4 bg-gray-300 dark:bg-gray-800 rounded"></div>
                </td>
              );
            }
            
            // ID column
            if (colIndex === 1) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-16"></div>
                </td>
              );
            }
            
            // Topic column (mono font)
            if (colIndex === 3) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-48"></div>
                </td>
              );
            }
            
            // Actions column (last)
            if (colIndex === columns.length - 1) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="flex items-center justify-center gap-3 w-full h-full">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded"></div>
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded"></div>
                  </div>
                </td>
              );
            }
            
            // Other columns (Vehicle, Timestamp)
            return (
              <td
                key={colIndex}
                className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                style={{ verticalAlign: "middle" }}
              >
                <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-32"></div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export default DataTableSkeleton;

