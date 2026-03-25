import React from "react";

const LogSkeleton = ({ lines = 8 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="flex items-start space-x-2 p-2">
          {/* Time skeleton */}
          <div className="min-w-[60px] h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          {/* Icon skeleton */}
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-0.5"></div>
          {/* Content skeleton */}
          <div className="flex-1 space-y-1">
            <div
              className={`h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse`}
              style={{ width: `${Math.random() * 40 + 60}%` }}
            ></div>
            {/* Randomly add second line for some entries */}
            {Math.random() > 0.6 && (
              <div
                className={`h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse`}
                style={{ width: `${Math.random() * 30 + 40}%` }}
              ></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogSkeleton;
