import React from "react";

const VehicleTableSkeleton = ({ rows = 5, columns = [] }) => {
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
            
            // Vehicle column (with name and code)
            if (colIndex === 1) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                  </div>
                </td>
              );
            }
            
            // Status column
            if (colIndex === 2) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="h-6 bg-gray-300 dark:bg-gray-800 rounded-full w-20 inline-block"></div>
                </td>
              );
            }
            
            // Battery column (with icon)
            if (colIndex === 4) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gray-300 dark:bg-gray-800 rounded"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
                  </div>
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
            
            // Other columns (Position, Signal, Temperature, Last Seen)
            return (
              <td
                key={colIndex}
                className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                style={{ verticalAlign: "middle" }}
              >
                <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-28"></div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export default VehicleTableSkeleton;

