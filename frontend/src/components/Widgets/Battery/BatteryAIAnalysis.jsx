import React, { useState, useEffect } from "react";
import useTranslation from "../../../hooks/useTranslation";
import { API_BASE_URL } from "../../../config";
import { FaRobot, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSpinner, FaChartLine, FaThermometerHalf, FaBolt, FaChargingStation } from "react-icons/fa";

export const BatteryAIAnalysis = ({ selectedVehicle, batteryData }) => {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Fetch battery history logs
  useEffect(() => {
    if (!selectedVehicle?.id) return;

    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const response = await fetch(
          `${API_BASE_URL}/vehicles/${selectedVehicle.id}/battery-logs?limit=50`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Battery history fetched:", data);
          setHistory(Array.isArray(data) ? data.slice(0, 50) : []);
        }
      } catch (err) {
        console.log("Could not fetch battery history:", err);
      }
    };

    fetchHistory();
  }, [selectedVehicle?.id]);

  useEffect(() => {
    if (!selectedVehicle?.id || !batteryData) return;

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Authentication required. Please login first.");
          return;
        }

        const vehicleBatteries = batteryData[selectedVehicle.id] || { 1: null, 2: null };
        const battery1 = vehicleBatteries[1];
        const battery2 = vehicleBatteries[2];

        const payload = {
          vehicle_id: selectedVehicle.id,
          vehicle_code: selectedVehicle.code || "",
          battery_count: Number(selectedVehicle.battery_count) || 1,
          current_status: {
            battery_1: battery1 ? {
              percentage: parseFloat(battery1.percentage || 0),
              voltage: parseFloat(battery1.voltage || 0),
              temperature: parseFloat(battery1.temperature || 0),
              current: parseFloat(battery1.current || 0),
              cell_voltages: battery1.cell_voltages || [],
              last_update: battery1.last_update || "",
            } : null,
            battery_2: battery2 ? {
              percentage: parseFloat(battery2.percentage || 0),
              voltage: parseFloat(battery2.voltage || 0),
              temperature: parseFloat(battery2.temperature || 0),
              current: parseFloat(battery2.current || 0),
              cell_voltages: battery2.cell_voltages || [],
              last_update: battery2.last_update || "",
            } : null,
          },
          history: history.map(log => ({
            battery_id: parseInt(log.battery_id || 0),
            percentage: parseFloat(log.percentage || 0),
            voltage: parseFloat(log.voltage || 0),
            temperature: parseFloat(log.temperature || 0),
            current: parseFloat(log.current || 0),
            timestamp: log.timestamp || log.created_at || "",
          })).filter(h => h.percentage > 0),
        };

        console.log("Battery analysis payload:", payload);

        const response = await fetch(`${API_BASE_URL}/ai/battery-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.text();
          throw new Error(`API Error ${response.status}: ${errData || "Unknown error"}`);
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (err) {
        console.error("Battery analysis error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchAnalysis, 500);
    return () => clearTimeout(timer);
  }, [selectedVehicle, batteryData]);

  const getHealthColor = (level) => {
    const colors = {
      EXCELLENT: "text-green-600 dark:text-green-400",
      GOOD: "text-green-500 dark:text-green-500",
      FAIR: "text-amber-600 dark:text-amber-400",
      POOR: "text-red-600 dark:text-red-400",
      CRITICAL: "text-red-700 dark:text-red-300",
    };
    return colors[level] || colors.FAIR;
  };

  const getHealthBg = (level) => {
    const colors = {
      EXCELLENT: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      GOOD: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      FAIR: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
      POOR: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      CRITICAL: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    };
    return colors[level] || colors.FAIR;
  };

  const getStatusIcon = (level) => {
    const icons = {
      EXCELLENT: <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
      GOOD: <FaCheckCircle className="w-5 h-5 text-green-500 dark:text-green-500" />,
      FAIR: <FaExclamationTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      POOR: <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />,
      CRITICAL: <FaTimesCircle className="w-5 h-5 text-red-700 dark:text-red-300" />,
    };
    return icons[level] || icons.FAIR;
  };

  if (!selectedVehicle?.id) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 mb-3">
      <div className="flex items-center gap-2 mb-4">
        <FaRobot className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">Battery Health Analysis</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <FaSpinner className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Analyzing battery patterns...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <p>{error}</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-3">
          {/* Health Status Badge */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${getHealthBg(analysis.health_status)}`}>
            {getStatusIcon(analysis.health_status)}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${getHealthColor(analysis.health_status)}`}>
                {analysis.health_status === "EXCELLENT" && "✓ Excellent Condition"}
                {analysis.health_status === "GOOD" && "✓ Good Condition"}
                {analysis.health_status === "FAIR" && "⚠ Fair Condition"}
                {analysis.health_status === "POOR" && "⚠ Poor Condition"}
                {analysis.health_status === "CRITICAL" && "✗ Critical - Needs Attention"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{analysis.summary}</p>
            </div>
          </div>

          {/* Key Metrics */}
          {analysis.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {analysis.metrics.map((metric, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">{metric.label}</p>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{metric.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Detected Issues */}
          {analysis.issues && analysis.issues.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Issues Detected</p>
              <ul className="space-y-1.5">
                {analysis.issues.map((issue, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="text-red-500 dark:text-red-400 font-bold shrink-0">⚠</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trends Analysis Detail */}
          {history.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FaChartLine className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Trend Analysis ({history.length} data points)</p>
              </div>
              {(() => {
                const percentages = history.filter(h => h.percentage).map(h => h.percentage);
                const temperatures = history.filter(h => h.temperature).map(h => h.temperature);
                const voltages = history.filter(h => h.voltage).map(h => h.voltage);
                const currents = history.filter(h => h.current).map(h => h.current);

                const trends = [];

                const renderIcon = (iconName) => {
                  const iconMap = {
                    discharge: <FaChartLine className="w-4 h-4" />,
                    temperature: <FaThermometerHalf className="w-4 h-4" />,
                    voltage: <FaBolt className="w-4 h-4" />,
                    current: <FaChargingStation className="w-4 h-4" />,
                  };
                  return iconMap[iconName] || iconMap.discharge;
                };

                // Discharge rate
                if (percentages.length > 1) {
                  const dischargeDrop = percentages[0] - percentages[percentages.length - 1];
                  const avgDischarge = (dischargeDrop / percentages.length).toFixed(2);
                  trends.push({
                    icon: "discharge",
                    label: "Discharge Rate",
                    value: `${avgDischarge}% per entry`,
                    color: dischargeDrop > 10 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                  });
                } else if (percentages.length === 1) {
                  trends.push({
                    icon: "discharge",
                    label: "Current Level",
                    value: `${percentages[0].toFixed(1)}%`,
                    color: "text-blue-600 dark:text-blue-400"
                  });
                }

                // Temperature
                if (temperatures.length > 0) {
                  const maxTemp = Math.max(...temperatures);
                  const minTemp = Math.min(...temperatures);
                  const avgTemp = temperatures.reduce((a, b) => a + b) / temperatures.length;
                  trends.push({
                    icon: "temperature",
                    label: "Temperature",
                    value: `${minTemp.toFixed(1)}°C ~ ${maxTemp.toFixed(1)}°C (avg ${avgTemp.toFixed(1)}°C)`,
                    color: maxTemp > 50 ? "text-red-600 dark:text-red-400" : avgTemp > 45 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                  });
                }

                // Voltage stability
                if (voltages.length > 1) {
                  const voltageDrop = voltages[voltages.length - 1] - voltages[0];
                  const voltageDropPercent = ((voltageDrop / Math.abs(voltages[0])) * 100).toFixed(2);
                  trends.push({
                    icon: "voltage",
                    label: "Voltage Stability",
                    value: `${voltageDrop > 0 ? "+" : ""}${voltageDrop.toFixed(3)}V (${voltageDropPercent}%)`,
                    color: Math.abs(voltageDrop) > 0.5 ? "text-red-600 dark:text-red-400" : Math.abs(voltageDrop) > 0.2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                  });
                } else if (voltages.length === 1) {
                  trends.push({
                    icon: "voltage",
                    label: "Current Voltage",
                    value: `${voltages[0].toFixed(2)}V`,
                    color: "text-blue-600 dark:text-blue-400"
                  });
                }

                // Discharge current
                if (currents.length > 0) {
                  const maxCurrent = Math.max(...currents);
                  const avgCurrent = currents.reduce((a, b) => a + b) / currents.length;
                  trends.push({
                    icon: "current",
                    label: "Discharge Current",
                    value: `${avgCurrent.toFixed(2)}A (peak ${maxCurrent.toFixed(2)}A)`,
                    color: maxCurrent > 10 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                  });
                }

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {trends.length > 0 ? trends.map((trend, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={trend.color}>{renderIcon(trend.icon)}</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{trend.label}</p>
                        </div>
                        <p className={`text-xs font-semibold ${trend.color}`}>{trend.value}</p>
                      </div>
                    )) : (
                      <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-4 col-span-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">History data loaded but insufficient for trend analysis</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 dark:text-blue-400 font-bold shrink-0">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Analysis Confidence */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <span>Analysis Confidence</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{analysis.confidence}</span>
          </div>
        </div>
      )}

      {!loading && !error && !analysis && (
        <div className="py-6 text-center text-gray-400 dark:text-gray-600 text-sm">
          <p>No battery data available</p>
        </div>
      )}
    </div>
  );
};
