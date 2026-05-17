const ChartSkeleton = () => {
  return (
    <div className="bg-white dark:bg-black dark:border-1 dark:border-gray-700 rounded-3xl shadow py-4 px-8 h-96 col-span-3 animate-pulse">
      {/* Chart Title */}
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4 w-32"></div>

      {/* Chart Area */}
      <div className="relative h-72 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-end justify-center p-4">
        {/* Simulated chart bars/lines */}
        <div className="flex items-end justify-between w-full h-full">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-gray-300 dark:bg-gray-600 rounded-t w-8"
              style={{ height: `${30 + (idx % 3) * 20}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChartSkeleton;
