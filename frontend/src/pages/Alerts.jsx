import { useState } from "react";
import useTitle from "../hooks/useTitle";
import { useAlertData } from "../hooks/useAlertData";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import useTranslation from "../hooks/useTranslation";
import { toast } from "../components/ui";
import {
  AlertsHeader,
  AlertsWidgets,
  AlertsTable,
} from "../components/Widgets/Alerts";

const Alerts = () => {
  const { t } = useTranslation();
  useTitle(t("pages.alerts.title"));

  const tr = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{{${paramKey}}}`, String(value));
    });
    return text;
  };

  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const {
    alerts = [],
    stats = { critical: 0, warning: 0, info: 0, total: 0 },
    loading = false,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearAllAlerts,
  } = useAlertData() || {};

  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton = timeoutLoading && loading && alerts.length === 0;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleAcknowledge = async (alertId) => {
    const success = await acknowledgeAlert(alertId);
    if (success) {
      toast.success(t("pages.alerts.ackSuccess"));
    } else {
      toast.error(t("pages.alerts.ackFailed"));
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    const result = await clearAllAlerts();
    setIsClearing(false);
    setShowClearModal(false);
    if (result?.success) {
      toast.success(t("pages.alerts.clearSuccess"));
      window.dispatchEvent(new Event("alert-count-refresh"));
    } else {
      const errorMessage = result?.error
        ? `${t("pages.alerts.clearFailed")}: ${result.error}`
        : t("pages.alerts.clearFailed");
      toast.error(errorMessage);
    }
  };

  const handleAckAllResult = (result) => {
    if (result?.success) {
      toast.success(t("pages.alerts.ackAllSuccess") || "All alerts acknowledged");
    } else {
      toast.error(t("pages.alerts.ackAllFailed") || "Failed to acknowledge all alerts");
    }
  };

  return (
    <div className="p-4">
      <AlertsHeader
        t={t}
        alerts={alerts}
        acknowledgeAllAlerts={acknowledgeAllAlerts}
        onClearAll={() => setShowClearModal(true)}
        showClearModal={showClearModal}
        setShowClearModal={setShowClearModal}
        onConfirmClearAll={handleConfirmClearAll}
        isClearing={isClearing}
        onAckAllResult={handleAckAllResult}
      />

      <AlertsWidgets
        stats={stats}
        shouldShowSkeleton={shouldShowSkeleton}
        t={t}
        tr={tr}
      />

      <AlertsTable
        alerts={alerts}
        loading={loading}
        onAcknowledge={handleAcknowledge}
        formatTimestamp={formatTimestamp}
        t={t}
      />
    </div>
  );
};

export default Alerts;
