import React, { useState, useEffect, useMemo, useRef } from "react";
import { AttitudeIndicator, HeadingIndicator } from "react-flight-indicators";
import { useLogDataContext } from "../../../contexts/LogDataContext";
import useVehicleConnectionStatus from "../../../hooks/useVehicleConnectionStatus";
import useTranslation from "../../../hooks/useTranslation";

const TelemetryPanel = React.memo(({ selectedVehicle = null }) => {
  const { t } = useTranslation();
  const { vehicleLogs, ws } = useLogDataContext();
  const { isVehicleOnline } = useVehicleConnectionStatus();
  const [loading, setLoading] = useState(true);
  const [showTimeout, setShowTimeout] = useState(false);
  const [indicatorSize, setIndicatorSize] = useState(260);
  const containerRef = useRef(null);

  // Fill container width with small padding on each side
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIndicatorSize(Math.max(120, width - 16));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
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

  // Get values from vehicleLog — cleared when vehicle is offline
  const isOnline = isVehicleOnline(selectedVehicle?.code);
  const effectiveLog = isOnline ? vehicleLog : null;
  const roll = effectiveLog?.roll ?? 0;
  const pitch = effectiveLog?.pitch ?? 0;
  const heading =
    (effectiveLog?.heading != null
      ? effectiveLog.heading
      : effectiveLog?.yaw) ?? 0;

  return (
    <div ref={containerRef} className="h-full p-2 flex flex-col items-center justify-center">
      {/* Flight Indicators - Vertical Layout */}
      <div className="flex flex-col items-center gap-2 md:gap-4 w-full">
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
