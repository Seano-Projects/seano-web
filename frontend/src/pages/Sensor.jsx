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
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";

const Sensor = () => {
  useTitle("Sensor");
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
      toast.success("Sensor created successfully!");
      setShowAddSensorModal(false);
      fetchSensors();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create sensor");
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
      toast.success("Sensor updated successfully!");
      fetchSensors();
      setShowEditSensorModal(false);
      setEditData(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update sensor");
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
      toast.success("Sensor deleted successfully!");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSensors();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete sensor");
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
      toast.success(
        `${deleteTarget.ids.length} sensor(s) deleted successfully!`,
      );
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSensors();
    } catch (error) {
      toast.error("Failed to delete some sensors");
    }
  };

  const handleViewSensor = (sensor) => {
    // TODO: Implement view sensor details
    toast.success(`Viewing sensor: ${sensor.name}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Title
          title="Sensor Management"
          subtitle="Manage and monitor all sensor devices"
        />
        {hasPermission("sensor.manage") && (
          <button
            onClick={() => setShowAddSensorModal(true)}
            className="font-semibold flex items-center gap-4 px-3 py-2 rounded-lg text-white hover:bg-blue-700 transition duration-300 cursor-pointer hover:shadow-lg hover:shadow-fourth/50 bg-fourth dark:hover:bg-blue-700"
          >
            <TbPhotoSensor size={20} />
            Add Sensor
          </button>
        )}
      </div>
      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 px-4 pb-4">
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
        title="Delete Sensor"
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
