import React from "react";

const MissionCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-slate-600 rounded-xl p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-20 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
      </div>

      {/* Progress Label */}
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-8"></div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 mb-2">
        <div className="h-2 bg-gray-300 dark:bg-slate-500 rounded-full w-1/2"></div>
      </div>

      {/* Additional Info */}
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
    </div>
  );
};

export default MissionCardSkeleton;
