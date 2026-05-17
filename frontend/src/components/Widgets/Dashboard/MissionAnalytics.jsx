import { FaChartLine } from "react-icons/fa6";
import {
  MdOutlineRadar,
  MdCheckCircle,
  MdCancel,
  MdPending,
} from "react-icons/md";
import useMissionData from "../../../hooks/useMissionData";

const MissionAnalytics = () => {
  const { loading, refreshData, getVehicleAnalytics } = useMissionData();

  const vehicleAnalytics = getVehicleAnalytics();

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-slate-600 p-8 rounded-3xl">
        <div className="flex items-center gap-2 mb-6">
          <FaChartLine size={30} className="text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Mission Analytics
          </h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-slate-600 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-slate-600 p-8 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FaChartLine size={30} className="text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Mission Analytics
          </h1>
        </div>
      </div>

      {/* Analytics Content */}
      {vehicleAnalytics.length === 0 ? (
        <div className="text-center py-8">
          <MdOutlineRadar
            size={48}
            className="mx-auto mb-3 text-gray-400 dark:text-gray-600"
          />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No mission data available for analytics
          </p>
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6 border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Fleet Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {vehicleAnalytics.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Active Vehicles
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {vehicleAnalytics.reduce((sum, v) => sum + v.completed, 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Total Completed
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {vehicleAnalytics.reduce((sum, v) => sum + v.failed, 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Total Failed
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {vehicleAnalytics.reduce((sum, v) => sum + v.active, 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Currently Active
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Analytics */}
          <div className="space-y-4">
            {vehicleAnalytics.map((vehicle, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-100 dark:border-slate-700"
              >
                {/* Vehicle Name */}
                <div className="flex items-center gap-2 mb-3">
                  <MdOutlineRadar size={20} className="text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {vehicle.vehicle}
                  </h3>
                  <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    Success Rate: {vehicle.successRate}%
                  </span>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Total Missions */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <MdOutlineRadar
                        size={24}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {vehicle.total}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Total Missions
                    </div>
                  </div>

                  {/* Completed Missions */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <MdCheckCircle
                        size={24}
                        className="text-green-600 dark:text-green-400"
                      />
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {vehicle.completed}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Completed
                    </div>
                  </div>

                  {/* Failed Missions */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <MdCancel
                        size={24}
                        className="text-red-600 dark:text-red-400"
                      />
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {vehicle.failed}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Failed
                    </div>
                  </div>

                  {/* Active Missions */}
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                      <MdPending
                        size={24}
                        className="text-yellow-600 dark:text-yellow-400"
                      />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {vehicle.active}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Active
                    </div>
                  </div>
                </div>

                {/* Progress Bar for Success Rate */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Success Rate</span>
                    <span>{vehicle.successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        vehicle.successRate >= 80
                          ? "bg-green-500"
                          : vehicle.successRate >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${vehicle.successRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MissionAnalytics;
