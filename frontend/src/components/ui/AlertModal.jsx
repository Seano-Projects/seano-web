import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaShieldAlt, FaBolt, FaTimes } from "react-icons/fa";

const COUNTDOWN_SECONDS = 15;
let _globalSeq = 0;

const AlertModal = () => {
  const [queue, setQueue] = useState([]);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  const dismiss = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setQueue((prev) => prev.slice(1));
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const alertId = e.detail?.id;
      // Deduplicate: useAlertData runs in 5 components simultaneously, all dispatch
      // alert:critical for the same alert. Block duplicates for 30s window.
      if (alertId != null) {
        if (seenIdsRef.current.has(alertId)) return;
        seenIdsRef.current.add(alertId);
        setTimeout(() => seenIdsRef.current.delete(alertId), 30_000);
      }
      setQueue((prev) => [...prev, { ...e.detail, _seq: ++_globalSeq }]);
    };
    window.addEventListener("alert:critical", handler);
    return () => window.removeEventListener("alert:critical", handler);
  }, []);

  // Use _seq (unique per enqueue) so the timer always restarts for each new alert,
  // even if two queued items share the same database ID.
  const currentSeq = queue[0]?._seq ?? null;
  useEffect(() => {
    if (currentSeq === null) return;

    setCountdown(COUNTDOWN_SECONDS);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [currentSeq]);

  useEffect(() => {
    if (countdown === 0 && queue.length > 0) {
      dismiss();
    }
  }, [countdown, queue.length, dismiss]);

  if (queue.length === 0) return null;

  const alert = queue[0];
  const typeLower = (alert.alert_type || alert.type || "").toLowerCase();
  const isAntiTheft = typeLower === "anti_theft" || typeLower === "antitheft";
  const isFailsafe = typeLower === "failsafe";

  const ringColor = isAntiTheft ? "border-red-500" : "border-yellow-500";
  const iconBg = isAntiTheft
    ? "bg-red-500/20 border-red-400"
    : "bg-yellow-500/20 border-yellow-400";
  const iconColor = isAntiTheft ? "text-red-400" : "text-yellow-400";
  const titleColor = isAntiTheft ? "text-red-400" : "text-yellow-400";
  const progressColor = isAntiTheft ? "bg-red-500" : "bg-yellow-500";
  const title = isAntiTheft
    ? "Anti-Theft Alert"
    : isFailsafe
      ? "Failsafe Alert"
      : "Critical Alert";

  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`relative bg-white dark:bg-black border-2 ${ringColor} rounded-2xl shadow-2xl p-6 w-96 max-w-[90vw]`}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
          aria-label="Dismiss"
        >
          <FaTimes />
        </button>

        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full border-2 ${iconBg} flex items-center justify-center`}
          >
            {isAntiTheft ? (
              <FaShieldAlt className={`text-2xl ${iconColor}`} />
            ) : (
              <FaBolt className={`text-2xl ${iconColor}`} />
            )}
          </div>

          <div className="text-center">
            <div className={`font-bold text-lg ${titleColor}`}>{title}</div>
            {alert.vehicle_name && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {alert.vehicle_name}
              </div>
            )}
            {alert.message && (
              <div className="text-gray-700 dark:text-gray-300 text-sm mt-2 leading-relaxed">
                {alert.message}
              </div>
            )}
          </div>

          <div className="w-full">
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressColor} transition-all duration-1000`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
              Auto-dismiss in {countdown}s
            </div>
          </div>

          <button
            onClick={dismiss}
            className={`w-full py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
              isAntiTheft
                ? "bg-red-600 hover:bg-red-500"
                : "bg-yellow-600 hover:bg-yellow-500"
            }`}
          >
            Acknowledge
          </button>

          {queue.length > 1 && (
            <div className="text-xs text-gray-400">
              +{queue.length - 1} more alert{queue.length > 2 ? "s" : ""} pending
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AlertModal;
