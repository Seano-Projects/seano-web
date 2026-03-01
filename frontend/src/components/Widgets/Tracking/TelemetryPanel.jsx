import React, { useState, useEffect, useMemo } from "react";
import { AttitudeIndicator, HeadingIndicator } from "react-flight-indicators";
import { useLogData } from "../../../hooks/useLogData";
import useTranslation from "../../../hooks/useTranslation";

const TelemetryPanel = React.memo(({ selectedVehicle = null }) => {
  const { t } = useTranslation();
  const { vehicleLogs, ws } = useLogData(); // Get vehicle logs from WebSocket
  const [loading, setLoading] = useState(true);
  const [showTimeout, setShowTimeout] = useState(false);
  const [indicatorSize, setIndicatorSize] = useState(280);

  // Handle responsive indicator size
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setIndicatorSize(Math.min(width * 0.75, 240)); // Mobile - increased
      } else if (width < 768) {
        setIndicatorSize(280); // Small tablet - increased
      } else if (width < 1024) {
        setIndicatorSize(300); // Tablet - increased
      } else {
        setIndicatorSize(320); // Desktop - increased
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Find latest vehicle log for selected vehicle
  const vehicleLog = useMemo(() => {
    if (!selectedVehicle?.id || vehicleLogs.length === 0) return null;

    // Filter by vehicle ID and get the latest (first in array, newest first)
    const filtered = vehicleLogs.filter(
      (log) => (log.vehicle?.id || log.vehicle_id) == selectedVehicle.id,
    );

    const latest = filtered.length > 0 ? filtered[0] : null;

    return latest;
  }, [vehicleLogs, selectedVehicle]);

  // Set loading to false after initial load
  useEffect(() => {
    if (vehicleLogs.length > 0 || !selectedVehicle?.id) {
      setLoading(false);
    }
  }, [vehicleLogs, selectedVehicle]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading && !showTimeout) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          {t("tracking.telemetry.loading")}
        </div>
      </div>
    );
  }

  // Get values from vehicleLog
  const roll = vehicleLog?.roll || 0;
  const pitch = vehicleLog?.pitch || 0;
  const heading = vehicleLog?.heading || vehicleLog?.yaw || 0;

  return (
    <div className="h-full p-3 md:p-6 flex flex-col items-center justify-center">
      {/* Flight Indicators - Vertical Layout */}
      <div className="flex flex-col items-center gap-3 md:gap-6 w-full">
        {/* Attitude Indicator */}
        <div className="flex justify-center w-full">
          <AttitudeIndicator
            size={indicatorSize}
            roll={roll}
            pitch={pitch}
            showBox={false}
          />
        </div>

        {/* Heading Indicator */}
        <div className="flex justify-center w-full">
          <HeadingIndicator
            size={indicatorSize}
            heading={heading}
            showBox={false}
          />
        </div>
      </div>
    </div>
  );
});

export default TelemetryPanel;
