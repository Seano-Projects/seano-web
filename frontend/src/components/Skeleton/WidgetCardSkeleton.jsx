const WidgetCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        {/* Icon container skeleton */}
        <div className="p-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg">
          <div className="w-6 h-6 bg-gray-300 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
      <div className="space-y-1">
        {/* Value skeleton */}
        <div className="h-8 bg-gray-300 dark:bg-gray-800 rounded w-20 mb-2"></div>
        {/* Title skeleton */}
        <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-24 mb-2"></div>
        {/* Trend section skeleton */}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 dark:bg-gray-800 rounded"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-800 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
};

export default WidgetCardSkeleton;
