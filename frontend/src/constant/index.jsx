import { GoDatabase } from "react-icons/go";
import { IoIosLogOut } from "react-icons/io";
import {
  FaChartBar,
  FaBatteryFull,
  FaThermometerHalf,
  FaBatteryHalf,
} from "react-icons/fa";
import { HiOutlineBellAlert } from "react-icons/hi2";

import {
  MdOutlineRadar,
  MdWifiTethering,
  MdSpeed,
  MdNavigation,
  MdSignalCellular4Bar,
  MdOutlineSensors,
} from "react-icons/md";
import {
  TbGps,
  TbArrowsUpDown,
  TbSpeedboat,
  TbRouteSquare,
  TbCompass,
  TbPhotoSensor,
  TbCategory,
  TbNotification,
} from "react-icons/tb";
import {
  FaArrowTrendDown,
  FaArrowTrendUp,
  FaShip,
  FaArrowRight,
  FaWrench,
  FaUser,
  FaRoute,
  FaBell,
  FaUserShield,
  FaClock,
  FaFile,
  FaTriangleExclamation,
  FaRuler,
  FaKey,
  FaEye,
  FaPen,
  FaTrash,
  FaRegUser,
} from "react-icons/fa6";
import { HiOutlineStatusOffline, HiOutlineStatusOnline } from "react-icons/hi";
import { RiRouteLine, RiShieldUserLine, RiUser3Line } from "react-icons/ri";
import { LuUserCog } from "react-icons/lu";
import { IoGameController } from "react-icons/io5";

const sizeIcon = 18;

export const dashboardLink = {
  href: "/dashboard",
  icon: FaChartBar,
  text: "nav.dashboard",
  size: sizeIcon,
};

export const menuGroups = [
  {
    title: "nav.dataOperations",
    requiredPermission: "tracking.read",
    userOnly: true,
    items: [
      {
        href: "/tracking",
        icon: MdOutlineRadar,
        text: "nav.tracking",
        size: sizeIcon,
        requiredPermission: "tracking.read",
      },
      {
        href: "/control",
        icon: IoGameController,
        text: "nav.control",
        size: sizeIcon,
        requiredPermission: "control.read",
      },
    ],
  },
  {
    title: "nav.dataMission",
    userOnly: true,
    items: [
      {
        href: "/mission-planner",
        icon: TbGps,
        text: "nav.missionPlanner",
        size: sizeIcon,
        requiredPermission: "missions.read",
      },
      {
        href: "/missions",
        icon: RiRouteLine,
        text: "nav.missions",
        size: sizeIcon,
        requiredPermission: "missions.read",
      },
    ],
  },
  {
    title: "nav.dataMonitoring",
    userOnly: true,
    items: [
      {
        href: "/battery",
        icon: FaBatteryHalf,
        text: "nav.battery",
        size: sizeIcon,
        requiredPermission: "battery.read",
      },
      {
        href: "/logs",
        icon: TbArrowsUpDown,
        text: "nav.log",
        size: sizeIcon,
        requiredPermission: "logs.read",
      },
      {
        href: "/alerts",
        icon: HiOutlineBellAlert,
        text: "nav.alerts",
        size: sizeIcon,
        requiredPermission: "alerts.read",
      },
      {
        href: "/notification",
        icon: TbNotification,
        text: "nav.notification",
        size: sizeIcon,
        requiredPermission: "notifications.read",
      },
    ],
  },
  {
    title: "nav.sensorMonitoring",
    userOnly: true,
    items: [
      {
        href: "/sensor-monitoring/ctd",
        icon: MdOutlineSensors,
        text: "nav.ctd",
        size: sizeIcon,
        requiredPermission: "sensor-monitoring.read",
      },
    ],
  },
  {
    title: "nav.dataManagement",
    requiredPermission: "vehicles.read",
    items: [
      {
        href: "/vehicle",
        icon: TbSpeedboat,
        text: "nav.vehicle",
        size: sizeIcon,
        requiredPermission: "vehicles.read",
      },
      {
        href: "/data",
        icon: GoDatabase,
        text: "nav.data",
        size: sizeIcon,
        requiredPermission: "sensor_logs.read",
      },
      {
        href: "/sensor",
        icon: TbPhotoSensor,
        text: "nav.sensor",
        size: sizeIcon,
        requiredPermission: "sensors.read",
      },
      {
        href: "/sensor-type",
        icon: TbCategory,
        text: "nav.sensorType",
        size: sizeIcon,
        requiredPermission: "sensor_types.read",
        adminOnly: true,
      },
    ],
  },
  {
    title: "nav.userManagement",
    requiredPermission: "users.read",
    adminOnly: true,
    items: [
      {
        href: "/user",
        icon: RiUser3Line,
        text: "nav.user",
        size: sizeIcon,
        requiredPermission: "users.read",
        adminOnly: true,
      },
      {
        href: "/role",
        icon: LuUserCog,
        text: "nav.role",
        size: sizeIcon,
        requiredPermission: "roles.read",
        adminOnly: true,
      },
      {
        href: "/permission",
        icon: RiShieldUserLine,
        text: "nav.permission",
        size: sizeIcon,
        requiredPermission: "permissions.read",
        adminOnly: true,
      },
    ],
  },
];

export const linksbottom = [
  {
    href: "/profile",
    icon: FaRegUser,
    text: "nav.profile",
    size: sizeIcon,
    type: "link",
  },
  {
    action: "logout",
    icon: IoIosLogOut,
    text: "nav.logout",
    size: sizeIcon,
    type: "button",
  },
];

// Error Data
export const ERROR_MESSAGES = {
  400: {
    title: "Bad Current Ahead",
    description:
      "Your request drifted off course, please check your navigation input.",
  },
  401: {
    title: "Unauthorized Waters",
    description:
      "You’re entering restricted waters. Please log in to continue your voyage.",
  },
  403: {
    title: "Access Forbidden",
    description:
      "These coordinates are off-limits. You don’t have permission to dock here.",
  },
  404: {
    title: "Lost at Sea",
    description:
      "The page you’re looking for has drifted away into the digital ocean.",
  },
  408: {
    title: "Signal Timeout",
    description:
      "Your ship took too long to respond, connection lost with the control center.",
  },
  409: {
    title: "Route Conflict",
    description:
      "Two ships are on a collision course — please adjust your navigation plan.",
  },
  410: {
    title: "Gone with the Tide",
    description:
      "The resource you’re looking for has sailed away and no longer exists.",
  },
  418: {
    title: "I’m a Teapot (and a Captain!)",
    description:
      "This vessel can’t brew coffee — try a different command, sailor ☕⚓",
  },
  429: {
    title: "Too Many Waves",
    description:
      "You’ve sent too many requests — the ocean needs a moment to calm down.",
  },
  500: {
    title: "Engine Malfunction",
    description:
      "A storm hit below deck. Our system engineers are working on repairs.",
  },
  502: {
    title: "Turbulent Waters",
    description:
      "Our servers hit rough waves. Please try again after the storm passes.",
  },
  503: {
    title: "Maintenance Voyage",
    description:
      "The fleet is currently under maintenance. We’ll be back on course soon.",
  },
  504: {
    title: "Connection Overboard",
    description:
      "The server didn’t respond in time — the tide carried your request away.",
  },
  511: {
    title: "Network Dock Required",
    description:
      "Your ship isn’t connected to the main harbor. Please check your network access.",
  },
  default: {
    title: "Unknown Waters",
    description:
      "Something unexpected happened on the open sea. Please return to safer shores.",
  },
};

// Management Card Data
export const getDataManagementCards = (rawLogsStats = null) => {
  const defaultStats = {
    totalRecords: 0,
    totalSize: 0,
    lastSync: new Date().toISOString(),
    quality: 0,
    todayRecords: 0,
    weeklyGrowth: 0,
  };

  const stats = rawLogsStats || defaultStats;
  const lastSyncTime = new Date(stats.lastSync);
  const timeDiff = Math.floor((new Date() - lastSyncTime) / (1000 * 60)); // minutes ago

  // Helper function to format time difference
  const formatTimeDiff = (minutes) => {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return [
    {
      title: "Total Raw Records",
      value:
        stats.totalRecords > 0
          ? stats.totalRecords.toLocaleString()
          : "No data",
      description:
        "Total semua raw logs yang tersimpan di sistem. Data langsung dari tabel raw_logs berdasarkan struktur database.",
      source: "raw_logs table",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      trendIcon:
        stats.weeklyGrowth > 0 ? (
          <svg
            className="w-3 h-3 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        ),
      trendText:
        stats.weeklyGrowth > 0
          ? `+${stats.weeklyGrowth}% from last week`
          : "No growth data",
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Storage Size",
      value:
        stats.totalSize > 0
          ? `${(stats.totalSize / 1024 / 1024).toFixed(1)} MB`
          : "0 MB",
      description:
        "Ukuran total storage yang digunakan oleh raw_logs table. Data real dari database berdasarkan ukuran tabel.",
      source: "raw_logs table size calculation",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
      ),
      trendIcon: (
        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                (stats.totalSize / (100 * 1024 * 1024)) * 100,
                100,
              )}%`,
            }}
          ></div>
        </div>
      ),
      trendText: `${Math.min(
        (stats.totalSize / (100 * 1024 * 1024)) * 100,
        100,
      ).toFixed(1)}% of estimated capacity`,
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Today's Records",
      value: stats.todayRecords > 0 ? stats.todayRecords.toLocaleString() : "0",
      badge: "logs",
      description:
        "Jumlah raw logs yang diterima hari ini. Menunjukkan aktivitas terkini sistem logging.",
      source: "raw_logs (created_at today)",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      trendIcon:
        stats.todayRecords > 0 ? (
          <svg
            className="w-3 h-3 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        ),
      trendText:
        stats.todayRecords > 0
          ? `${stats.todayRecords} logs today`
          : "No logs today",
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Data Quality",
      value: stats.quality > 0 ? `${stats.quality.toFixed(1)}%` : "N/A",
      badge:
        stats.quality >= 90
          ? "Excellent"
          : stats.quality >= 70
            ? "Good"
            : "Poor",
      description:
        "Persentase kualitas data berdasarkan validasi raw_logs. Rasio data yang valid vs total data yang masuk.",
      source: "raw_logs validation analysis",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      trendIcon:
        stats.quality >= 90 ? (
          <svg
            className="w-3 h-3 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-orange-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      trendText:
        stats.quality >= 90
          ? "Excellent quality"
          : stats.quality >= 70
            ? "Good quality"
            : "Needs improvement",
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Last Sync",
      value: formatTimeDiff(timeDiff),
      badge: timeDiff < 5 ? "Live" : timeDiff < 60 ? "Recent" : "Outdated",
      description:
        "Waktu terakhir raw_logs diterima. Menunjukkan status konektivitas real-time dengan sistem logging.",
      source: "raw_logs.created_at (latest)",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
      trendIcon:
        timeDiff < 5 ? (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        ) : timeDiff < 60 ? (
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        ) : (
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        ),
      trendText:
        timeDiff < 5
          ? "Real-time sync active"
          : timeDiff < 60
            ? "Recently synced"
            : "Sync outdated",
      iconBgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    },
  ];
};

// Dashboard Overview Cards - Updated with new requirements
export const getOverviewCardsData = (
  vehicles = [],
  missions = [],
  alerts = [],
  t = (key) => key, // Default to returning key if t function not provided
) => {
  // Calculate vehicle stats
  const totalVehicles = vehicles.length;
  const vehiclesOnMission = vehicles.filter(
    (v) => v.status === "on_mission",
  ).length;

  // Calculate mission stats
  const totalMissions = missions.length;
  const missionsOnProgress = missions.filter(
    (m) => m.status === "on_progress" || m.status === "Active",
  ).length;

  // Calculate alerts stats
  const totalAlerts = alerts.length;

  return [
    {
      title: t("dashboard.cards.totalVehicles"),
      value: totalVehicles,
      icon: <FaShip size={26} className="text-blue-500" />,
      trendIcon:
        totalVehicles > 0 ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        totalVehicles > 0
          ? `${totalVehicles} ${t("dashboard.cards.vehiclesRegistered")}`
          : t("dashboard.cards.noVehiclesAvailable"),
    },
    {
      title: t("dashboard.cards.vehiclesOnMission"),
      value: vehiclesOnMission,
      icon: <TbRouteSquare size={26} className="text-indigo-500" />,
      trendIcon:
        vehiclesOnMission > 0 ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        vehiclesOnMission > 0
          ? `${vehiclesOnMission} ${t("dashboard.cards.vehiclesActive")}`
          : t("dashboard.cards.noActiveMissions"),
    },
    {
      title: t("dashboard.cards.totalMissions"),
      value: totalMissions,
      icon: <FaRoute size={26} className="text-purple-500" />,
      trendIcon:
        totalMissions > 0 ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        totalMissions > 0
          ? `${totalMissions} ${t("dashboard.cards.missionsCreated")}`
          : t("dashboard.cards.noMissionsAvailable"),
    },
    {
      title: t("dashboard.cards.missionsInProgress"),
      value: missionsOnProgress,
      icon: <HiOutlineStatusOnline size={26} className="text-green-500" />,
      trendIcon:
        missionsOnProgress > 0 ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        missionsOnProgress > 0
          ? `${missionsOnProgress} ${t("dashboard.cards.missionsRunning")}`
          : t("dashboard.cards.noActiveMissions"),
    },
    {
      title: t("dashboard.cards.totalAlerts"),
      value: totalAlerts,
      icon: <FaBell size={26} className="text-red-500" />,
      trendIcon:
        totalAlerts > 0 ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        totalAlerts > 0
          ? `${totalAlerts} ${t("dashboard.cards.alertsPending")}`
          : t("dashboard.cards.noAlerts"),
    },
  ];
};

// Vehicle Data Card - Original function (kept for backward compatibility)
export const getWidgetData = (stats, vehicles) => {
  const {
    totalToday,
    totalYesterday,
    onMissionToday,
    onMissionYesterday,
    onlineToday,
    onlineYesterday,
    offlineToday,
    offlineYesterday,
    maintenanceToday,
    maintenanceYesterday,
  } = stats;

  return [
    {
      title: "Total Vehicle",
      value: vehicles.length > 0 ? totalToday : 0,
      icon: <FaShip size={26} className="text-blue-500" />,
      trendIcon:
        vehicles.length === 0 ? (
          <FaArrowRight className="text-gray-400" />
        ) : totalToday > totalYesterday ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : totalToday < totalYesterday ? (
          <FaArrowTrendDown className="text-red-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        vehicles.length === 0
          ? "No data available"
          : totalToday > totalYesterday
            ? `${totalToday - totalYesterday} up from yesterday`
            : totalToday < totalYesterday
              ? `${totalYesterday - totalToday} down from yesterday`
              : "No change from yesterday",
    },
    {
      title: "On Mission",
      value: vehicles.length > 0 ? onMissionToday : 0,
      icon: <TbRouteSquare size={26} className="text-slate-500" />,
      trendIcon:
        vehicles.length === 0 ? (
          <FaArrowRight className="text-gray-400" />
        ) : onMissionToday > onMissionYesterday ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : onMissionToday < onMissionYesterday ? (
          <FaArrowTrendDown className="text-red-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        vehicles.length === 0
          ? "No data available"
          : onMissionToday > onMissionYesterday
            ? `${onMissionToday - onMissionYesterday} up from yesterday`
            : onMissionToday < onMissionYesterday
              ? `${onMissionYesterday - onMissionToday} down from yesterday`
              : "No change from yesterday",
    },
    {
      title: "Online",
      value: vehicles.length > 0 ? onlineToday : 0,
      icon: <HiOutlineStatusOnline size={26} className="text-green-500" />,
      trendIcon:
        vehicles.length === 0 ? (
          <FaArrowRight className="text-gray-400" />
        ) : onlineToday > onlineYesterday ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : onlineToday < onlineYesterday ? (
          <FaArrowTrendDown className="text-red-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        vehicles.length === 0
          ? "No data available"
          : onlineToday > onlineYesterday
            ? `${onlineToday - onlineYesterday} up from yesterday`
            : onlineToday < onlineYesterday
              ? `${onlineYesterday - onlineToday} down from yesterday`
              : "No change from yesterday",
    },
    {
      title: "Offline",
      value: vehicles.length > 0 ? offlineToday : 0,
      icon: <HiOutlineStatusOffline size={26} className="text-red-500" />,
      trendIcon:
        vehicles.length === 0 ? (
          <FaArrowRight className="text-gray-400" />
        ) : offlineToday > offlineYesterday ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : offlineToday < offlineYesterday ? (
          <FaArrowTrendDown className="text-red-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        vehicles.length === 0
          ? "No data available"
          : offlineToday > offlineYesterday
            ? `${offlineToday - offlineYesterday} up from yesterday`
            : offlineToday < offlineYesterday
              ? `${offlineYesterday - offlineToday} down from yesterday`
              : "No change from yesterday",
    },
    {
      title: "Maintenance",
      value: vehicles.length > 0 ? maintenanceToday : 0,
      icon: <FaWrench size={26} className="text-yellow-500" />,
      trendIcon:
        vehicles.length === 0 ? (
          <FaArrowRight className="text-gray-400" />
        ) : maintenanceToday > maintenanceYesterday ? (
          <FaArrowTrendUp className="text-green-500" />
        ) : maintenanceToday < maintenanceYesterday ? (
          <FaArrowTrendDown className="text-red-500" />
        ) : (
          <FaArrowRight className="text-gray-400" />
        ),
      trendText:
        vehicles.length === 0
          ? "No data available"
          : maintenanceToday > maintenanceYesterday
            ? `${maintenanceToday - maintenanceYesterday} up from yesterday`
            : maintenanceToday < maintenanceYesterday
              ? `${maintenanceYesterday - maintenanceToday} down from yesterday`
              : "No change from yesterday",
    },
  ];
};

// Sensor Widget Data - Similar to vehicle widget data
export const getSensorWidgetData = (stats, sensors) => {
  return [
    {
      title: "Total Sensors",
      value: sensors.length > 0 ? stats.totalSensors : 0,
      icon: <TbPhotoSensor size={26} className="text-blue-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensors.length === 0
          ? "No data available"
          : `${stats.totalSensors} sensors configured`,
    },
    {
      title: "Active",
      value: sensors.length > 0 ? stats.activeSensors : 0,
      icon: <HiOutlineStatusOnline size={26} className="text-green-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensors.length === 0
          ? "No data available"
          : `${stats.activeSensors} sensors online`,
    },
    {
      title: "Inactive",
      value: sensors.length > 0 ? stats.inactiveSensors : 0,
      icon: <HiOutlineStatusOffline size={26} className="text-red-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensors.length === 0
          ? "No data available"
          : `${stats.inactiveSensors} sensors offline`,
    },
    {
      title: "Hidrografi",
      value: sensors.length > 0 ? stats.hidrografiSensors : 0,
      icon: <TbPhotoSensor size={26} className="text-blue-400" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensors.length === 0
          ? "No data available"
          : `${stats.hidrografiSensors} hidrografi sensors`,
    },
    {
      title: "Oseanografi",
      value: sensors.length > 0 ? stats.oseanografiSensors : 0,
      icon: <MdWifiTethering size={26} className="text-cyan-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensors.length === 0
          ? "No data available"
          : `${stats.oseanografiSensors} oseanografi sensors`,
    },
  ];
};

// SensorType Widget Data - Similar to sensor widget data
export const getSensorTypeWidgetData = (stats, sensorTypes) => {
  return [
    {
      title: "Total Types",
      value: sensorTypes.length > 0 ? stats.totalSensorTypes : 0,
      icon: <TbCategory size={26} className="text-blue-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensorTypes.length === 0
          ? "No data available"
          : `${stats.totalSensorTypes} sensor types configured`,
    },
    {
      title: "Active",
      value: sensorTypes.length > 0 ? stats.activeSensorTypes : 0,
      icon: <HiOutlineStatusOnline size={26} className="text-green-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensorTypes.length === 0
          ? "No data available"
          : `${stats.activeSensorTypes} types active`,
    },
    {
      title: "Inactive",
      value: sensorTypes.length > 0 ? stats.inactiveSensorTypes : 0,
      icon: <HiOutlineStatusOffline size={26} className="text-red-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensorTypes.length === 0
          ? "No data available"
          : `${stats.inactiveSensorTypes} types inactive`,
    },
    {
      title: "Hidrografi",
      value: sensorTypes.length > 0 ? stats.hidrografiTypes : 0,
      icon: <TbPhotoSensor size={26} className="text-blue-400" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensorTypes.length === 0
          ? "No data available"
          : `${stats.hidrografiTypes} hidrografi types`,
    },
    {
      title: "Oseanografi",
      value: sensorTypes.length > 0 ? stats.oseanografiTypes : 0,
      icon: <MdWifiTethering size={26} className="text-cyan-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        sensorTypes.length === 0
          ? "No data available"
          : `${stats.oseanografiTypes} oseanografi types`,
    },
  ];
};

// User Widget Data - Similar to other widget data patterns
export const getUserWidgetData = (
  stats,
  users,
  roles = [],
  permissions = [],
) => {
  return [
    {
      title: "Total Users",
      value: users.length > 0 ? stats.total : 0,
      icon: <FaUser size={26} className="text-blue-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        users.length === 0
          ? "No data available"
          : `${stats.total} users registered`,
    },
    {
      title: "Verified Users",
      value: users.length > 0 ? stats.verified : 0,
      icon: <HiOutlineStatusOnline size={26} className="text-green-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        users.length === 0
          ? "No data available"
          : `${stats.verified} users verified`,
    },
    {
      title: "Unverified Users",
      value: users.length > 0 ? stats.unverified : 0,
      icon: <HiOutlineStatusOffline size={26} className="text-yellow-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        users.length === 0
          ? "No data available"
          : `${stats.unverified} users unverified`,
    },
    {
      title: "Total Roles",
      value: roles.length,
      icon: <FaUserShield size={26} className="text-purple-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        roles.length === 0
          ? "No roles available"
          : `${roles.length} roles created`,
    },
    {
      title: "Total Permissions",
      value: permissions.length,
      icon: <FaKey size={26} className="text-cyan-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        permissions.length === 0
          ? "No permissions available"
          : `${permissions.length} permissions created`,
    },
  ];
};

// Role Widget Data - Similar to other widget data patterns
export const getRoleWidgetData = (stats, roles) => {
  return [
    {
      title: "Total Roles",
      value: roles.length > 0 ? stats.total : 0,
      icon: <FaUserShield size={26} className="text-blue-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        roles.length === 0
          ? "No data available"
          : `${stats.total} roles created`,
    },
    {
      title: "Recent Roles",
      value: roles.length > 0 ? stats.recent : 0,
      icon: <FaClock size={26} className="text-green-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        roles.length === 0
          ? "No data available"
          : `${stats.recent} roles this week`,
    },
    {
      title: "With Description",
      value: roles.length > 0 ? stats.withDescription : 0,
      icon: <FaFile size={26} className="text-orange-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        roles.length === 0
          ? "No data available"
          : `${stats.withDescription} roles documented`,
    },
    {
      title: "Without Description",
      value: roles.length > 0 ? stats.withoutDescription : 0,
      icon: <FaTriangleExclamation size={26} className="text-red-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        roles.length === 0
          ? "No data available"
          : `${stats.withoutDescription} roles need description`,
    },
    {
      title: "Avg Desc Length",
      value: roles.length > 0 ? `${stats.avgDescLength}` : "0",
      icon: <FaRuler size={26} className="text-purple-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        roles.length === 0
          ? "No data available"
          : `${stats.avgDescLength} chars average`,
    },
  ];
};

// Permission Widget Data - Similar to other widget data patterns
export const getPermissionWidgetData = (stats, permissions) => {
  return [
    {
      title: "Total Permissions",
      value: permissions.length > 0 ? stats.total : 0,
      icon: <FaKey size={26} className="text-blue-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        permissions.length === 0
          ? "No data available"
          : `${stats.total} permissions created`,
    },
    {
      title: "Recent Permissions",
      value: permissions.length > 0 ? stats.recent : 0,
      icon: <FaClock size={26} className="text-green-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        permissions.length === 0
          ? "No data available"
          : `${stats.recent} permissions this week`,
    },
    {
      title: "Read Permissions",
      value: permissions.length > 0 ? stats.readPermissions : 0,
      icon: <FaEye size={26} className="text-cyan-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        permissions.length === 0
          ? "No data available"
          : `${stats.readPermissions} read permissions`,
    },
    {
      title: "Write Permissions",
      value: permissions.length > 0 ? stats.writePermissions : 0,
      icon: <FaPen size={26} className="text-orange-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        permissions.length === 0
          ? "No data available"
          : `${stats.writePermissions} write permissions`,
    },
    {
      title: "Delete Permissions",
      value: permissions.length > 0 ? stats.deletePermissions : 0,
      icon: <FaTrash size={26} className="text-red-500" />,
      trendIcon: <FaArrowRight className="text-gray-400" />,
      trendText:
        permissions.length === 0
          ? "No data available"
          : `${stats.deletePermissions} delete permissions`,
    },
  ];
};
