import React, { useState } from "react";
import useTranslation from "../../../hooks/useTranslation";
import { Card } from "./WeatherPrimitives";
import { FaRobot, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSpinner, FaSyncAlt } from "react-icons/fa";
import { API_BASE_URL } from "../../../config";

export const WeatherAIAnalysis = ({ weather, forecast }) => {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(null);

  const runAnalysis = async () => {
    if (!weather || loading) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Authentication required. Please login first.");
        return;
      }

      const payload = {
        temperature: parseFloat(weather.main?.temp || 0),
        wind_speed: parseFloat(weather.wind?.speed || 0),
        wind_gust: parseFloat(weather.wind?.gust || 0),
        humidity: parseInt(weather.main?.humidity || 0),
        pressure: parseInt(weather.main?.pressure || 0),
        description: String(weather.weather?.[0]?.description || ""),
        forecast: (forecast?.list || []).slice(0, 8).filter(item => item.main?.temp).map((item) => ({
          temp: parseFloat(item.main.temp),
          pop: parseFloat(item.pop || 0),
          rain: parseFloat(item.rain?.["3h"] || 0),
          dt: String(item.dt),
        })),
      };

      const response = await fetch(`${API_BASE_URL}/ai/weather-analysis`, {
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
      setLastAnalyzedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      LOW: "text-green-600 dark:text-green-400",
      MEDIUM: "text-amber-600 dark:text-amber-400",
      HIGH: "text-red-600 dark:text-red-400",
    };
    return colors[level] || colors.MEDIUM;
  };

  const getRiskBg = (level) => {
    const colors = {
      LOW: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      MEDIUM: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
      HIGH: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    };
    return colors[level] || colors.MEDIUM;
  };

  const getStatusIcon = (level) => {
    const icons = {
      LOW: <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
      MEDIUM: <FaExclamationTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      HIGH: <FaTimesCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    };
    return icons[level] || icons.MEDIUM;
  };

  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <FaRobot className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">AI Operational Analysis</p>
        </div>
        <div className="flex items-center gap-3">
          {lastAnalyzedAt && !loading && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {lastAnalyzedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading || !weather}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-200 dark:border-blue-800"
          >
            {loading ? (
              <FaSpinner className="w-3 h-3 animate-spin" />
            ) : (
              <FaSyncAlt className="w-3 h-3" />
            )}
            {loading ? "Analyzing..." : analysis ? "Re-analyze" : "Analyze"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <FaSpinner className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Analyzing weather conditions...</span>
        </div>
      )}

      {!loading && !analysis && !error && (
        <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm space-y-2">
          <FaRobot className="w-8 h-8 mx-auto opacity-30" />
          <p>Click <strong className="text-gray-500 dark:text-gray-400">Analyze</strong> to run AI weather analysis</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">Analysis uses current weather conditions &amp; forecast data</p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          <p>{error}</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${getRiskBg(analysis.risk_level)}`}>
            {getStatusIcon(analysis.risk_level)}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${getRiskColor(analysis.risk_level)}`}>
                {analysis.risk_level === "LOW" && "✓ Safe to Operate"}
                {analysis.risk_level === "MEDIUM" && "⚠ Operate with Caution"}
                {analysis.risk_level === "HIGH" && "✗ Do Not Operate"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{analysis.analysis}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
            <span className="text-xs text-gray-600 dark:text-gray-400">USV Operation Status</span>
            <span className={`text-xs font-semibold ${analysis.safe_to_operate ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {analysis.safe_to_operate ? "SAFE" : "NOT SAFE"}
            </span>
          </div>

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Recommendations</p>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="text-blue-500 dark:text-blue-400 font-bold shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            <span>Analysis Confidence</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{analysis.confidence}</span>
          </div>
        </div>
      )}
    </Card>
  );
};
