import { FaCheck, FaTrash } from "react-icons/fa";
import { Title, ConfirmModal } from "../../ui";

const NotificationHeader = ({
  t,
  stats,
  hasReadNotifications,
  markAllAsRead,
  showClearModal,
  setShowClearModal,
  onConfirmClear,
  isClearing,
}) => (
  <div className="flex items-center justify-between mb-4">
    <Title
      title={t("pages.notifications.title")}
      subtitle={t("pages.notifications.subtitle")}
    />
    <div className="flex items-center gap-3">
      {stats.unread > 0 && (
        <button
          type="button"
          onClick={markAllAsRead}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <FaCheck />
          {t("pages.notifications.dropdown.markAllRead")}
        </button>
      )}
      {hasReadNotifications && (
        <button
          type="button"
          onClick={() => setShowClearModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
        >
          <FaTrash />
          {t("pages.notifications.dropdown.clearRead")}
        </button>
      )}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={onConfirmClear}
        title={t("common.confirm")}
        message="Delete all read notifications? This cannot be undone."
        confirmText={t("pages.notifications.dropdown.clearRead")}
        cancelText={t("common.cancel")}
        type="danger"
        isLoading={isClearing}
      />
    </div>
  </div>
);

export default NotificationHeader;
