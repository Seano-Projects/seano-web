import { useEffect } from "react";
import useMissionData from "../../../hooks/useMissionData";
import useTranslation from "../../../hooks/useTranslation";
import { LoadingDots, Modal } from "../../ui";

const MissionModals = ({
  showNewMissionModal,
  setShowNewMissionModal,
  showLoadMissionModal,
  setShowLoadMissionModal,
  handleCreateMission,
  handleSelectMission,
  isCreatingMission,
}) => {
  const { missionData, loading, fetchMissionData } = useMissionData();
  const { t } = useTranslation();

  // Fetch mission data when Load Mission modal opens
  useEffect(() => {
    if (showLoadMissionModal) {
      fetchMissionData();
    }
  }, [showLoadMissionModal]);

  return (
    <>
      {/* New Mission Modal */}
      <Modal
        isOpen={showNewMissionModal}
        onClose={() => setShowNewMissionModal(false)}
        title={t("missionComponents.modals.createTitle")}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleCreateMission({
              name: formData.get("name"),
              description: formData.get("description"),
            });
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("missionComponents.modals.missionNameRequired")}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={t("missionComponents.modals.namePlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#018190] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("missionComponents.modals.description")}
              </label>
              <textarea
                name="description"
                rows="3"
                placeholder={t(
                  "missionComponents.modals.descriptionPlaceholder",
                )}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#018190] focus:border-transparent resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => setShowNewMissionModal(false)}
              disabled={isCreatingMission}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("missionComponents.modals.cancel")}
            </button>
            <button
              type="submit"
              disabled={isCreatingMission}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreatingMission ? (
                <LoadingDots size="sm" color="white" />
              ) : (
                t("missionComponents.modals.createButton")
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Load Mission Modal */}
      <Modal
        isOpen={showLoadMissionModal}
        onClose={() => setShowLoadMissionModal(false)}
        title={t("missionComponents.modals.loadTitle")}
        size="md"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingDots size="md" color="blue" />
          </div>
        ) : missionData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("missionComponents.modals.noMissions")}
          </div>
        ) : (
          <div className="custom-scrollbar max-h-[55dvh] space-y-3 overflow-y-auto sm:max-h-64">
            {missionData.map((mission) => (
              <div
                key={mission.id}
                onClick={() => handleSelectMission(mission)}
                className="p-3 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {mission.title || mission.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {Array.isArray(mission.waypoints)
                      ? mission.waypoints.length
                      : 0}{" "}
                    {t("missionComponents.modals.pts")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {mission.created_at
                      ? new Date(mission.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {mission.status || t("missionComponents.modals.draft")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowLoadMissionModal(false)}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {t("missionComponents.modals.cancel")}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default MissionModals;
