import { useState } from "react";
import useTitle from "../hooks/useTitle";
import useNotificationData from "../hooks/useNotificationData";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import useTranslation from "../hooks/useTranslation";
import { toast } from "../components/ui";
import {
  NotificationHeader,
  NotificationWidgets,
  NotificationTable,
} from "../components/Widgets/Notification";

const Notification = () => {
  const { t } = useTranslation();
  useTitle(t("pages.notifications.title"));

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
    notifications,
    loading,
    stats,
    markAsRead,
    markAllAsRead,
    clearRead,
  } = useNotificationData();
  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton =
    timeoutLoading && loading && notifications.length === 0;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days > 1
        ? tr("pages.notifications.dayAgoPlural", { count: days })
        : tr("pages.notifications.dayAgo", { count: days });
    } else if (hours > 0) {
      return hours > 1
        ? tr("pages.notifications.hourAgoPlural", { count: hours })
        : tr("pages.notifications.hourAgo", { count: hours });
    } else if (minutes > 0) {
      return minutes > 1
        ? tr("pages.notifications.minuteAgoPlural", { count: minutes })
        : tr("pages.notifications.minuteAgo", { count: minutes });
    }
    return t("pages.notifications.justNow");
  };

  const hasReadNotifications = notifications.some((item) => item.read);

  const handleConfirmClear = async () => {
    setIsClearing(true);
    const result = await clearRead();
    setIsClearing(false);
    setShowClearModal(false);
    if (result?.success) {
      toast.success("Read notifications cleared successfully");
    } else {
      toast.error("Failed to clear read notifications");
    }
  };

  return (
    <div className="p-4">
      <NotificationHeader
        t={t}
        stats={stats}
        hasReadNotifications={hasReadNotifications}
        markAllAsRead={markAllAsRead}
        showClearModal={showClearModal}
        setShowClearModal={setShowClearModal}
        onConfirmClear={handleConfirmClear}
        isClearing={isClearing}
      />

      <NotificationWidgets
        stats={stats}
        shouldShowSkeleton={shouldShowSkeleton}
        t={t}
        tr={tr}
      />

      <NotificationTable
        notifications={notifications}
        loading={loading}
        markAsRead={markAsRead}
        formatTimestamp={formatTimestamp}
        t={t}
      />
    </div>
  );
};

export default Notification;
