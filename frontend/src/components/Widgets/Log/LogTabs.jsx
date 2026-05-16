import React from "react";

const TABS = ["vehicle", "sensor", "raw", "antitheft", "failsafe", "command", "waypoint"];

const LogTabs = ({ activeTab, setActiveTab, t }) => (
  <div className="border-b border-gray-200 dark:border-slate-600">
    <nav className="flex space-x-8 px-6" aria-label="Tabs">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === tab
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {t(`pages.logs.tabs.${tab}`)}
        </button>
      ))}
    </nav>
  </div>
);

export default LogTabs;
