import React from "react";

const DataCard = ({
  title,
  children,
  action,
  headerExtra,
  className = "",
  showHeader = true,
  headerContent,
}) => {
  return (
    <div
      className={`bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6
         ${className}`}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          {headerContent ? (
            headerContent
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              <div className="flex items-center gap-2">
                {headerExtra && headerExtra}
                {action && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    {action}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default DataCard;
