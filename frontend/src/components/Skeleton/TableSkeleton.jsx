import React from "react";
import { FaShip } from "react-icons/fa6";
import DataCard from "../Widgets/DataCard";

const TableSkeleton = ({ rows = 2 }) => {
  return (
    <div className="px-4 animate-pulse">
      <DataCard
        title="Vehicle Overview"
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <FaShip size={20} /> Vehicle Overview
            </h2>
            <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
          </div>
        }
      >
        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full text-sm text-left">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-16"></div>
                </th>
                <th className="py-3 px-0 max-w-xs whitespace-nowrap">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
                </th>
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-14"></div>
                </th>
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
                </th>
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-10"></div>
                </th>
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-16"></div>
                </th>
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-14"></div>
                </th>
                <th className="py-3 px-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  {/* Vehicle Column - Complex layout with icon and text */}
                  <td className="py-3 px-0 max-w-xs whitespace-nowrap">
                    <div className="flex items-center justify-start gap-5">
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-800 rounded"></div>
                      <div className="flex flex-col gap-1">
                        <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-20"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-800 rounded w-16"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
                      </div>
                    </div>
                  </td>

                  {/* Status Column - Badge-like */}
                  <td className="py-3 px-2">
                    <div className="bg-gray-300 dark:bg-gray-800 rounded-full h-6 w-20"></div>
                  </td>

                  {/* Position Column */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-300 dark:bg-gray-800 rounded"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-24"></div>
                    </div>
                  </td>

                  {/* Battery Column */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-800 rounded"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-10"></div>
                    </div>
                  </td>

                  {/* Signal Column */}
                  <td className="py-3 px-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-10"></div>
                  </td>

                  {/* Temperature Column */}
                  <td className="py-3 px-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-12"></div>
                  </td>

                  {/* Last Seen Column */}
                  <td className="py-3 px-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-800 rounded w-16"></div>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-lg"></div>
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-800 rounded-lg"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
};

export default TableSkeleton;
