import { MdOutlineRadar } from "react-icons/md";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { HiDotsVertical } from "react-icons/hi";
import useMissionData from "../../../hooks/useMissionData";
import { MissionCardSkeleton } from "../../Skeleton";
import useTranslation from "../../../hooks/useTranslation";

const RecentMissions = () => {
  const { t } = useTranslation();
  const { getRecentMissions, loading, refreshData, lastUpdated } =
    useMissionData();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const missions = getRecentMissions ? getRecentMissions(3) : [];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-slate-600 p-8 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MdOutlineRadar size={30} className="text-orange-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("dashboard.recentMissions.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
              title="More options"
            >
              <HiDotsVertical size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black shadow-lg z-50 py-1 overflow-hidden">
                <Link
                  to="/missions"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <MdOutlineRadar
                    size={12}
                    className="text-gray-400 dark:text-gray-500"
                  />
                  {t("dashboard.recentMissions.viewAll")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mission Cards */}
      <div className="space-y-4">
        {loading ? (
          // Show skeleton loading
          <>
            <MissionCardSkeleton />
            <MissionCardSkeleton />
            <MissionCardSkeleton />
          </>
        ) : missions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MdOutlineRadar
              size={64}
              className="mb-4 text-gray-400 dark:text-gray-600"
            />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              {t("dashboard.recentMissions.noMissions")}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mb-4">
              {t("dashboard.recentMissions.createPrompt")}
            </p>
            <Link
              to="/missions"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {t("dashboard.recentMissions.createButton")}
            </Link>
          </div>
        ) : (
          missions.map((mission) => (
            <div
              key={mission.id}
              className="bg-white dark:bg-transparent border border-gray-200 dark:border-slate-600 rounded-xl p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {mission.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("dashboard.recentMissions.vehicle")}:{" "}
                    {typeof mission.vehicle === "string"
                      ? mission.vehicle
                      : mission.vehicle?.name || mission.vehicle?.code || "N/A"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-white text-xs font-medium rounded-full ${
                    mission.statusColor === "green"
                      ? "bg-green-500"
                      : mission.statusColor === "blue"
                        ? "bg-blue-500"
                        : mission.statusColor === "yellow"
                          ? "bg-yellow-500"
                          : mission.statusColor === "red"
                            ? "bg-red-500"
                            : "bg-gray-500"
                  }`}
                >
                  {mission.status}
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t("dashboard.recentMissions.progress")}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {mission.progress}%
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    mission.progress === 100
                      ? "bg-green-500"
                      : mission.statusColor === "green"
                        ? "bg-blue-500"
                        : mission.statusColor === "yellow"
                          ? "bg-yellow-500"
                          : mission.statusColor === "red"
                            ? "bg-red-500"
                            : "bg-blue-500"
                  }`}
                  style={{ width: `${mission.progress}%` }}
                ></div>
              </div>

              {/* Additional mission info */}
              {mission.waypoints > 0 && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {mission.waypoints} {t("dashboard.recentMissions.waypoints")}
                  {mission.distance > 0 && (
                    <span>
                      {" "}
                      • {(mission.distance / 1000).toFixed(1)}{" "}
                      {t("dashboard.recentMissions.km")}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Last updated info */}
        {lastUpdated && !loading && missions.length > 0 && (
          <div className="text-end pt-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("dashboard.recentMissions.lastUpdated")}:{" "}
              {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentMissions;
