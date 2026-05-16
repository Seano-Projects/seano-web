import { FaCheck, FaTrash } from "react-icons/fa";
import { Title, ConfirmModal } from "../../ui";

const AlertsHeader = ({
  t,
  alerts,
  acknowledgeAllAlerts,
  onClearAll,
  showClearModal,
  setShowClearModal,
  onConfirmClearAll,
  isClearing,
  onAckAllResult,
}) => (
  <div className="flex items-center justify-between mb-4">
    <Title
      title={t("pages.alerts.title")}
      subtitle={t("pages.alerts.subtitle")}
    />
    <div className="flex items-center gap-4">
      {alerts.some((a) => !a.acknowledged) && (
        <button
          onClick={async () => {
            const result = await acknowledgeAllAlerts();
            onAckAllResult(result);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <FaCheck />
          {t("pages.alerts.ackAll") || "Ack All"}
        </button>
      )}
      {alerts.length > 0 && (
        <button
          onClick={onClearAll}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
        >
          <FaTrash />
          {t("pages.alerts.clearAll")}
        </button>
      )}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={onConfirmClearAll}
        title={t("common.confirm")}
        message={t("pages.alerts.confirmClearAll")}
        confirmText={t("pages.alerts.clearAll")}
        cancelText={t("common.cancel")}
        type="danger"
        isLoading={isClearing}
      />
    </div>
  </div>
);

export default AlertsHeader;
