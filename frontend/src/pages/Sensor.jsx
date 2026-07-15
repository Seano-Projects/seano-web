import { useState } from "react";
import useTitle from "../hooks/useTitle";
import useSensorsData from "../hooks/useSensorsData";
import { usePermission } from "../hooks/usePermission";
import { Title } from "../components/ui";
import { WidgetCardSkeleton } from "../components/Skeleton";
import { WidgetCard, SensorTable, SensorModal } from "../components/Widgets";
import { getSensorWidgetData } from "../constant";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import { TbPhotoSensor } from "react-icons/tb";
import { toast } from "../components/ui";
import useNotify from "../hooks/useNotify";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";
import useTranslation from "../hooks/useTranslation";

const Sensor = () => {
  const { t } = useTranslation();
  useTitle(t("pages.management.sensor.title"));
  const notify = useNotify();
  const { hasPermission } = usePermission();
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [showEditSensorModal, setShowEditSensorModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editData, setEditData] = useState(null);
  const { sensors, loading, stats, fetchSensors } = useSensorsData();
  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton = timeoutLoading && loading && sensors.length === 0;
  const widgetData = getSensorWidgetData(stats, sensors);

  const handleCreateSensor = async (sensorData) => {
    try {
      await axios.post(API_ENDPOINTS.SENSORS.CREATE, sensorData);
      await notify.success(t("pages.management.sensor.created"), {
        title: t("pages.management.sensor.createdTitle"),
        action: notify.ACTIONS.SENSOR_CREATED,
      });
      setShowAddSensorModal(false);
      fetchSensors();
    } catch (error) {
      await notify.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          t("pages.management.sensor.createFailed"),
        {
          title: t("pages.management.sensor.createFailedTitle"),
          action: notify.ACTIONS.SENSOR_CREATED,
        },
      );
    }
  };

  const handleEditSensor = (sensor) => {
    setEditData({
      id: sensor.id,
      code: sensor.code,
      brand: sensor.brand,
      model: sensor.model,
      sensor_type_id: sensor.sensor_type_id,
      description: sensor.description,
      is_active: sensor.statusRaw,
    });
    setShowEditSensorModal(true);
  };

  const handleUpdateSensor = async (sensorData) => {
    try {
      await axios.put(API_ENDPOINTS.SENSORS.UPDATE(editData.id), sensorData);
      await notify.success(t("pages.management.sensor.updated"), {
        title: t("pages.management.sensor.updatedTitle"),
        action: notify.ACTIONS.SENSOR_UPDATED,
      });
      fetchSensors();
      setShowEditSensorModal(false);
      setEditData(null);
    } catch (error) {
      await notify.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          t("pages.management.sensor.updateFailed"),
        {
          title: t("pages.management.sensor.updateFailedTitle"),
          action: notify.ACTIONS.SENSOR_UPDATED,
        },
      );
    }
  };

  const handleDeleteSensor = (sensorId, sensorName) => {
    setDeleteTarget({ id: sensorId, name: sensorName });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await axios.delete(API_ENDPOINTS.SENSORS.DELETE(deleteTarget.id));
      await notify.success(t("pages.management.sensor.deleted"), {
        title: t("pages.management.sensor.deletedTitle"),
        action: notify.ACTIONS.SENSOR_DELETED,
      });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSensors();
    } catch (error) {
      await notify.error(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          t("pages.management.sensor.deleteFailed"),
        {
          title: t("pages.management.sensor.deleteFailedTitle"),
          action: notify.ACTIONS.SENSOR_DELETED,
        },
      );
    }
  };

  const handleBulkDelete = (sensorIds) => {
    setDeleteTarget({ ids: sensorIds, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!deleteTarget || !deleteTarget.ids) return;

    try {
      await Promise.all(
        deleteTarget.ids.map((id) =>
          axios.delete(API_ENDPOINTS.SENSORS.DELETE(id)),
        ),
      );
      await notify.success(
        `${deleteTarget.ids.length} sensor(s) deleted successfully!`,
        {
          title: t("pages.management.sensor.bulkDeletedTitle"),
          action: notify.ACTIONS.SENSOR_DELETED,
        },
      );
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSensors();
    } catch (error) {
      await notify.error(t("pages.management.sensor.bulkDeleteFailed"), {
        title: t("pages.management.sensor.bulkDeleteFailedTitle"),
        action: notify.ACTIONS.SENSOR_DELETED,
      });
    }
  };

  const handleViewSensor = (sensor) => {
    // Viewing - no toast needed, UI shows sensor details
    // TODO: Implement view sensor details
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title={t("pages.management.sensor.title")}
          subtitle={t("pages.management.sensor.subtitle")}
        />
        {hasPermission("sensor.manage") && (
          <button
            onClick={() => setShowAddSensorModal(true)}
            className="font-semibold flex items-center gap-4 px-3 py-2 rounded-lg text-white hover:bg-blue-700 transition duration-300 cursor-pointer hover:shadow-lg hover:shadow-fourth/50 bg-fourth dark:hover:bg-blue-700"
          >
            <TbPhotoSensor size={20} />
            {t("pages.management.sensor.add")}
          </button>
        )}
      </div>
      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pb-4">
        {shouldShowSkeleton
          ? // Skeleton Loading with timeout
            Array.from({ length: 5 }).map((_, idx) => (
              <WidgetCardSkeleton key={idx} />
            ))
          : widgetData.map((item, idx) => <WidgetCard key={idx} {...item} />)}
      </div>

      <SensorTable
        sensorData={sensors}
        loading={loading}
        onEdit={handleEditSensor}
        onDelete={handleDeleteSensor}
        onView={handleViewSensor}
        onBulkDelete={handleBulkDelete}
      />

      {/* Create Sensor Modal */}
      <SensorModal
        isOpen={showAddSensorModal}
        onClose={() => setShowAddSensorModal(false)}
        onSubmit={handleCreateSensor}
      />

      {/* Edit Sensor Modal */}
      <SensorModal
        isOpen={showEditSensorModal}
        onClose={() => {
          setShowEditSensorModal(false);
          setEditData(null);
        }}
        onSubmit={handleUpdateSensor}
        editData={editData}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={
          deleteTarget?.isBulk ? handleConfirmBulkDelete : handleConfirmDelete
        }
        title={t("pages.management.sensor.deleteTitle")}
        itemName={
          deleteTarget?.isBulk
            ? `${deleteTarget.ids.length} sensor(s)`
            : deleteTarget?.name
        }
        itemType="sensor"
      />
    </div>
  );
};

export default Sensor;
