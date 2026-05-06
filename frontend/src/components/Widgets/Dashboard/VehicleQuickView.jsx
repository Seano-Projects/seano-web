import React, { useMemo } from "react";
import {
  FaShip,
  FaBatteryFull,
  FaGaugeHigh,
  FaCompass,
  FaMapPin,
  FaCrosshairs,
  FaGear,
} from "react-icons/fa6";
import { VehicleDropdown } from "../";
import useTranslation from "../../../hooks/useTranslation";
import { useLogData, useVehicleConnectionStatus } from "../../../hooks";

const VehicleQuickView = ({
  vehicles,
  selectedVehicleId,
  setSelectedVehicleId,
}) => {
  const { t } = useTranslation();
  const { vehicleLogs, websocket } = useLogData();
  const { getVehicleStatus, isVehicleOnline } = useVehicleConnectionStatus();

  // Find selected vehicle from vehicles array
  const selectedVehicle = vehicles.find(
    (v) => String(v.id) === String(selectedVehicleId),
  );

  // Get latest log for selected vehicle (real-time from WebSocket)
  const latestLog = useMemo(() => {
    if (!selectedVehicleId || !vehicleLogs.length) return null;

    // Filter logs for selected vehicle and get the most recent one
    const vehicleSpecificLogs = vehicleLogs.filter(
      (log) => String(log.vehicle_id) === String(selectedVehicleId),
    );

    return vehicleSpecificLogs.length > 0 ? vehicleSpecificLogs[0] : null;
  }, [selectedVehicleId, vehicleLogs]);

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const diff = Date.now() - new Date(timestamp).getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 10) return "Just now";
      if (seconds < 60) return `${seconds}s ago`;
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return new Date(timestamp).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  // Determine connection status from MQTT LWT (realtime from broker)
  const connectionStatus = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.code) {
      return {
        color: "gray",
        text: t("dashboard.vehicleQuickView.noVehicleSelected"),
      };
    }

    const mqttStatus = getVehicleStatus(selectedVehicle.code);

    if (mqttStatus === "online") {
      return { color: "green", text: "Online" };
    } else if (mqttStatus === "offline") {
      return { color: "red", text: "Offline" };
    } else {
      // unknown - belum ada status dari MQTT
      return { color: "gray", text: "Unknown" };
    }
  }, [selectedVehicle, getVehicleStatus, t]);

  // Use real-time data from WebSocket if available, fallback to vehicle data
  const vehicleDetails = useMemo(() => {
    const resolveGpsStatus = (log) => {
      if (!log) {
        return t("dashboard.vehicleQuickView.noGPS");
      }

      if (typeof log.gps_ok === "boolean") {
        return log.gps_ok ? "GPS Fix" : t("dashboard.vehicleQuickView.noGPS");
      }

      if (typeof log.gps_ok === "string") {
        const normalized = log.gps_ok.toLowerCase();
        if (normalized === "true") {
          return "GPS Fix";
        }
        if (normalized === "false") {
          return t("dashboard.vehicleQuickView.noGPS");
        }
      }

      if (typeof log.gps_ok === "number") {
        return log.gps_ok > 0
          ? "GPS Fix"
          : t("dashboard.vehicleQuickView.noGPS");
      }

      const gpsNum =
        typeof log.gps_fix === "string"
          ? Number.parseInt(log.gps_fix, 10)
          : log.gps_fix;

      if (Number.isFinite(gpsNum)) {
        return gpsNum >= 3 ? "GPS Fix" : t("dashboard.vehicleQuickView.noGPS");
      }

      return t("dashboard.vehicleQuickView.noGPS");
    };

    if (!selectedVehicle) {
      return {
        status: t("dashboard.vehicleQuickView.noVehicleSelected"),
        lastUpdate: "N/A",
        battery: 0,
        speed: "0 m/s",
        heading: "N/A",
        gps: t("dashboard.vehicleQuickView.noGPS"),
        armed: "N/A",
        mode: "N/A",
        coordinates: "N/A",
      };
    }

    // If we have real-time log data from WebSocket, use it
    if (latestLog) {
      return {
        status: connectionStatus.text,
        lastUpdate: formatTimeAgo(latestLog.timestamp || latestLog.created_at),
        battery: latestLog.battery_percentage || latestLog.battery_level || 0,
        speed: latestLog.speed ? `${latestLog.speed.toFixed(1)} m/s` : "0 m/s",
        heading: latestLog.heading ? `${latestLog.heading.toFixed(0)}°` : "N/A",
        gps: resolveGpsStatus(latestLog),
        armed: latestLog.armed ? "Armed" : "Disarmed",
        mode: latestLog.mode || latestLog.flight_mode || "Manual",
        coordinates:
          latestLog.latitude && latestLog.longitude
            ? `${latestLog.latitude.toFixed(4)}, ${latestLog.longitude.toFixed(4)}`
            : "N/A",
      };
    }

    // Fallback to vehicle summary data (might be outdated)
    return {
      status: selectedVehicle.status || t("dashboard.vehicleQuickView.unknown"),
      lastUpdate: formatTimeAgo(selectedVehicle.updated_at),
      battery: selectedVehicle.battery_level || 0,
      speed: selectedVehicle.speed ? `${selectedVehicle.speed} m/s` : "0 m/s",
      heading: selectedVehicle.heading || "N/A",
      gps: selectedVehicle.gps_status || t("dashboard.vehicleQuickView.noGPS"),
      armed:
        selectedVehicle.armed_status || t("dashboard.vehicleQuickView.unknown"),
      mode: selectedVehicle.mode || "Manual",
      coordinates:
        selectedVehicle.latitude && selectedVehicle.longitude
          ? `${selectedVehicle.latitude.toFixed(4)}, ${selectedVehicle.longitude.toFixed(4)}`
          : "N/A",
    };
  }, [selectedVehicle, latestLog, connectionStatus, t]);

  const statusCards = [
    {
      icon: FaBatteryFull,
      title: t("dashboard.vehicleQuickView.battery"),
      value: `${typeof vehicleDetails.battery === "number" ? vehicleDetails.battery.toFixed(1) : vehicleDetails.battery}%`,
      color: "green",
    },
    {
      icon: FaGaugeHigh,
      title: t("dashboard.vehicleQuickView.speed"),
      value: vehicleDetails.speed,
      color: "blue",
    },
    {
      icon: FaCompass,
      title: t("dashboard.vehicleQuickView.heading"),
      value: vehicleDetails.heading,
      color: "purple",
    },
    {
      icon: FaCrosshairs,
      title: t("dashboard.vehicleQuickView.gps"),
      value: vehicleDetails.gps,
      color: "yellow",
    },
    {
      icon: FaGear,
      title: t("dashboard.vehicleQuickView.armed"),
      value: vehicleDetails.armed,
      color: "orange",
    },
    {
      icon: FaGear,
      title: t("dashboard.vehicleQuickView.mode"),
      value: vehicleDetails.mode,
      color: "cyan",
    },
  ];

  return (
    <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-slate-600 p-8 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <FaShip size={30} className="text-blue-500" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("dashboard.vehicleQuickView.title")}
        </h1>
      </div>
      <VehicleDropdown
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onVehicleChange={(vehicle) => {
          // Handle both null (placeholder) and vehicle object
          setSelectedVehicleId(vehicle?.id || null);
        }}
        placeholder={t("dashboard.vehicleQuickView.placeholder")}
        showPlaceholder={true}
      />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-gray-900 dark:text-white font-semibold">
          {t("dashboard.vehicleQuickView.status")}
        </h1>
        <div className="flex items-center gap-2 px-2 rounded-3xl">
          <div
            className={`h-3 w-3 rounded-full ${
              connectionStatus.color === "green"
                ? "bg-green-500 animate-pulse"
                : connectionStatus.color === "yellow"
                  ? "bg-yellow-500"
                  : connectionStatus.color === "red"
                    ? "bg-red-500"
                    : "bg-gray-500"
            }`}
          ></div>
          <h1 className="text-gray-900 dark:text-white">
            {vehicleDetails.status}
          </h1>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-gray-900 dark:text-white font-semibold">
          {t("dashboard.vehicleQuickView.lastUpdate")}
        </h1>
        <div className="flex items-center gap-2 px-2 rounded-3xl">
          <h1 className="text-gray-900 dark:text-white">
            {vehicleDetails.lastUpdate}
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {statusCards.map((card, index) => (
          <div
            key={index}
            className="bg-transparent border border-gray-200 dark:border-slate-600 rounded-xl p-4 flex items-center gap-3 dark:hover:bg-slate-600 transition-colors duration-200"
          >
            <div className="bg-white border border-gray-200 p-3 rounded-full">
              <card.icon size={24} className={`text-${card.color}-500`} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                {card.title}
              </h3>
              <h2 className="text-gray-900 dark:text-white text-xl font-bold">
                {card.value}
              </h2>
            </div>
          </div>
        ))}
      </div>
      {/* Coordinates Card */}
      <div className="bg-transparent border border-gray-200 dark:border-slate-600 rounded-xl p-4 flex items-center gap-3 dark:hover:bg-slate-600 transition-colors duration-200 mt-4">
        <div className="bg-white border border-gray-200 p-3 rounded-full">
          <FaMapPin size={24} className="text-red-500" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium">
            {t("dashboard.vehicleQuickView.coordinates")}
          </h3>
          <h2 className="text-gray-900 dark:text-white text-lg font-bold">
            {vehicleDetails.coordinates}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default VehicleQuickView;
