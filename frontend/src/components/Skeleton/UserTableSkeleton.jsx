import React from "react";

const UserTableSkeleton = ({ rows = 5, columns = [] }) => {
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
            
            // User column (with avatar)
            if (colIndex === 1) {
              return (
                <td
                  key={colIndex}
                  className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.cellClassName || ""}`}
                  style={{ verticalAlign: "middle" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-full flex-shrink-0"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-32"></div>
                  </div>
                </td>
              );
            }
            
            // Status column
            if (colIndex === 3) {
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
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded"></div>
                  </div>
                </td>
              );
            }
            
            // Other columns (Email, Created, Last Updated)
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

export default UserTableSkeleton;
