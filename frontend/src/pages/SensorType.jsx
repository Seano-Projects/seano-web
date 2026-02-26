import { useState } from "react";
import useTitle from "../hooks/useTitle";
import useSensorTypesData from "../hooks/useSensorTypesData";
import { Title } from "../components/ui";
import { WidgetCardSkeleton } from "../components/Skeleton";
import {
  WidgetCard,
  SensorTypeTable,
  SensorTypeModal,
} from "../components/Widgets";
import { getSensorTypeWidgetData } from "../constant";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import { TbCategory } from "react-icons/tb";
import { toast } from "../components/ui";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";

const SensorType = () => {
  useTitle("Sensor Type");
  const [showAddSensorTypeModal, setShowAddSensorTypeModal] = useState(false);
  const [showEditSensorTypeModal, setShowEditSensorTypeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { sensorTypes, loading, stats, fetchSensorTypes } = useSensorTypesData();
  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton =
    timeoutLoading && loading && sensorTypes.length === 0;
  const widgetData = getSensorTypeWidgetData(stats, sensorTypes);

  const handleCreateSensorType = async (sensorTypeData) => {
    try {
      await axios.post(API_ENDPOINTS.SENSOR_TYPES.CREATE, sensorTypeData);
      toast.success("Sensor type created successfully!");
      setShowAddSensorTypeModal(false);
      fetchSensorTypes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create sensor type");
    }
  };

  const handleEditSensorType = (sensorType) => {
    setEditData({
      id: sensorType.id,
      name: sensorType.name,
      description: sensorType.description,
    });
    setShowEditSensorTypeModal(true);
  };

  const handleUpdateSensorType = async (sensorTypeData) => {
    try {
      await axios.put(
        API_ENDPOINTS.SENSOR_TYPES.UPDATE(editData.id),
        sensorTypeData,
      );
      toast.success("Sensor type updated successfully!");
      setShowEditSensorTypeModal(false);
      setEditData(null);
      fetchSensorTypes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update sensor type");
    }
  };

  const handleDeleteSensorType = (id, name) => {
    setDeleteTarget({ id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await axios.delete(API_ENDPOINTS.SENSOR_TYPES.DELETE(deleteTarget.id));
      toast.success("Sensor type deleted successfully!");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSensorTypes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete sensor type");
    }
  };

  const handleViewSensorType = (sensorType) => {
    toast.info(`Viewing sensor type: ${sensorType.name}`);
  };

  const handleBulkDeleteSensorTypes = (ids) => {
    setDeleteTarget({ ids, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!deleteTarget || !deleteTarget.ids) return;
    
    try {
      await Promise.all(
        deleteTarget.ids.map((id) => axios.delete(API_ENDPOINTS.SENSOR_TYPES.DELETE(id))),
      );
      toast.success(`${deleteTarget.ids.length} sensor type(s) deleted successfully!`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchSensorTypes();
    } catch (error) {
      toast.error("Failed to delete some sensor types");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Title
          title="Sensor Type Management"
          subtitle="Manage and configure sensor type categories"
        />
        <button
          onClick={() => setShowAddSensorTypeModal(true)}
          className="font-semibold flex items-center gap-4 px-3 py-2 rounded-lg text-white hover:bg-blue-700 transition duration-300 cursor-pointer hover:shadow-lg hover:shadow-fourth/50 bg-fourth dark:hover:bg-blue-700"
        >
          <TbCategory size={20} />
          Add Sensor Type
        </button>
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

      <SensorTypeTable
        sensorTypeData={sensorTypes}
        loading={loading}
        onEdit={handleEditSensorType}
        onDelete={handleDeleteSensorType}
        onView={handleViewSensorType}
        onBulkDelete={handleBulkDeleteSensorTypes}
      />

      {/* Add SensorType Modal */}
      <SensorTypeModal
        isOpen={showAddSensorTypeModal}
        onClose={() => setShowAddSensorTypeModal(false)}
        onSubmit={handleCreateSensorType}
      />

      {/* Edit SensorType Modal */}
      <SensorTypeModal
        isOpen={showEditSensorTypeModal}
        onClose={() => {
          setShowEditSensorTypeModal(false);
          setEditData(null);
        }}
        onSubmit={handleUpdateSensorType}
        editData={editData}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={deleteTarget?.isBulk ? handleConfirmBulkDelete : handleConfirmDelete}
        title="Delete Sensor Type"
        itemName={deleteTarget?.isBulk ? `${deleteTarget.ids.length} sensor type(s)` : deleteTarget?.name}
        itemType="sensor type"
      />
    </div>
  );
};

export default SensorType;
