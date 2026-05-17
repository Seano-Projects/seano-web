import { useState } from "react";
import {
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaThermometerHalf,
  FaClock,
  FaSearch,
  FaShip,
} from "react-icons/fa";
import { FaSignal } from "react-icons/fa6";
import { useVehicleConnectionStatus } from "../../../hooks";
import useBatteryData from "../../../hooks/useBatteryData";

const VehicleCards = ({
  vehicleData,
  loading = false,
  onEdit,
  onDelete,
  onBulkDelete,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { getVehicleStatus } = useVehicleConnectionStatus();
  const { batteryData } = useBatteryData();

  const getBatteryBarColor = (level, unit) => {
    if (unit === 0) return "bg-blue-500";
    return "bg-cyan-400";
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "online":
      case "idle":
        return { label: "Online", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" };
      case "on_mission":
        return { label: "On Mission", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
      case "maintenance":
        return { label: "Maintenance", dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400" };
      default:
        return { label: "Offline", dot: "bg-gray-400 dark:bg-gray-500", text: "text-gray-500 dark:text-gray-400" };
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Never";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMin = Math.floor((now - date) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  const filteredVehicles = vehicleData.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.code || "").toLowerCase().includes(q)
    );
  });

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black h-56" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search & Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={13} />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.length} selected</span>
            <button
              onClick={() => { onBulkDelete?.(selectedIds); setSelectedIds([]); }}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5"
            >
              <FaTrash size={11} /> Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FaShip className="mx-auto mb-3 text-gray-300 dark:text-gray-700" size={40} />
          <p className="font-medium">No vehicles found</p>
          <p className="text-sm mt-1">Click &quot;Add Vehicle&quot; to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((veh) => {
            const mqttStatus = veh.code ? getVehicleStatus(veh.code) : "offline";
            const statusConfig = getStatusConfig(mqttStatus);
            const vehicleBatteries = batteryData?.[veh.id] || {};
            const batteryCount = Number(veh.battery_count) === 1 ? 1 : 2;
            const isSelected = selectedIds.includes(veh.id);

            const batteryLevels = Array.from({ length: batteryCount }, (_, idx) => {
              const batteryObj = vehicleBatteries[idx + 1];
              return Math.round(batteryObj ? batteryObj.percentage : (idx === 0 ? (veh.battery_level || 0) : 0));
            });

            return (
              <div
                key={veh.id}
                className={`relative rounded-xl border bg-white dark:bg-black overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-blue-500/5 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                {/* Ship Icon Background Decoration */}
                <FaShip
                  className="absolute -left-4 top-1/2 -translate-y-1/2 text-gray-100 dark:text-gray-800/30 pointer-events-none"
                  size={130}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between p-4 pb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelect(veh.id)}
                        className="appearance-none w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-fourth focus:ring-offset-0 hover:border-gray-400 dark:hover:border-gray-500 checked:bg-fourth checked:border-fourth dark:checked:bg-fourth dark:checked:border-fourth checked:hover:bg-blue-700 dark:checked:hover:bg-blue-700 shrink-0"
                        style={{
                          backgroundImage: isSelected
                            ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                            : "none",
                          backgroundSize: "100% 100%",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {veh.name || `Vehicle ${veh.id}`}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          {veh.code || `USV-${String(veh.id).padStart(3, "0")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${mqttStatus === "online" || mqttStatus === "idle" ? "animate-pulse" : ""}`} />
                      <span className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
                    </div>
                  </div>

                  {/* Battery Visual */}
                  <div className="px-4 py-3">
                    <div className="flex items-end gap-3 justify-center">
                      {batteryLevels.map((level, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5">
                          {/* Mini Battery Icon Visual */}
                          <div className="relative w-10 h-20">
                            {/* Terminal */}
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-t" />
                            {/* Battery Body */}
                            <div className="absolute inset-0 top-1 bg-gray-200 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
                              {/* Fill */}
                              <div
                                className={`absolute bottom-0 left-0 right-0 ${getBatteryBarColor(level, idx)} transition-all duration-700 rounded-b-sm`}
                                style={{ height: `${Math.min(level, 100)}%` }}
                              />
                              {/* Percentage */}
                              <div className="relative z-10 w-full h-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                  {level}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">
                            {batteryCount > 1 ? `Bat ${String.fromCharCode(65 + idx)}` : "Battery"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="px-4 pb-3 grid grid-cols-2 gap-y-2 gap-x-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <FaMapMarkerAlt size={10} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      <span className="truncate">
                        {veh.latitude && veh.longitude
                          ? `${Number(veh.latitude).toFixed(4)}, ${Number(veh.longitude).toFixed(4)}`
                          : "No position"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <FaSignal size={10} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      <span>{veh.rssi ? `${veh.rssi} dBm` : "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <FaThermometerHalf size={10} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      <span>
                        {veh.temperature
                          ? typeof veh.temperature === "number"
                            ? `${veh.temperature}°C`
                            : veh.temperature
                          : "0°C"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <FaClock size={10} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      <span>{formatLastSeen(veh.last_seen)}</span>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="px-4 pb-3">
                    <span className="text-[11px] text-gray-500 dark:text-gray-600">
                      Capacity: <span className="text-gray-700 dark:text-gray-400 font-medium">{(Number(veh.battery_total_capacity_ah) || 20).toFixed(1)} Ah</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => onEdit(veh)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <FaEdit size={12} /> Edit
                    </button>
                    <div className="w-px h-5 bg-gray-100 dark:bg-gray-800" />
                    <button
                      onClick={() => onDelete(veh.id, veh.name)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VehicleCards;
