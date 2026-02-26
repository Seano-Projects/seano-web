import { useState, useEffect } from "react";
import React from "react";
import { Modal } from "../../ui";
import { Dropdown } from "../";
import axios from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";

const SensorModal = ({ isOpen, onClose, onSubmit, editData }) => {
  const [selectedSensorType, setSelectedSensorType] = useState(
    editData?.sensor_type_id || "",
  );
  const [sensorTypeOptions, setSensorTypeOptions] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const isEditMode = !!editData;

  // Fetch sensor types from API
  useEffect(() => {
    if (!isOpen) return;

    const fetchSensorTypes = async () => {
      setLoadingTypes(true);
      try {
        const response = await axios.get(API_ENDPOINTS.SENSOR_TYPES.LIST);
        const types = Array.isArray(response.data) ? response.data : [];
        setSensorTypeOptions(types);
      } catch (error) {
        setSensorTypeOptions([]);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchSensorTypes();
  }, [isOpen]);

  // Reset form when editData changes
  React.useEffect(() => {
    if (editData) {
      setSelectedSensorType(editData.sensor_type_id || "");
    } else {
      setSelectedSensorType("");
    }
  }, [editData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const sensorData = {
      code: formData.get("code"),
      brand: formData.get("brand"),
      model: formData.get("model"),
      sensor_type_id: selectedSensorType,
      description: formData.get("description"),
      is_active: editData?.is_active !== undefined ? editData.is_active : true,
    };

    onSubmit(sensorData);

    // Reset form only if not in edit mode
    if (!isEditMode) {
      e.target.reset();
      setSelectedSensorType("");
    }
  };

  const handleClose = () => {
    setSelectedSensorType("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Edit Sensor" : "Add New Sensor"}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Sensor Code - PENTING: Harus sama dengan yang dipakai di MQTT topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Sensor Code *
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                (Used in MQTT topic)
              </span>
            </label>
            <input
              type="text"
              name="code"
              required
              defaultValue={editData?.code || ""}
              placeholder="e.g., CTD-MIDAS-01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Must match the sensor_code used in MQTT topic:
              seano/&#123;vehicle_code&#125;/&#123;sensor_code&#125;/data
            </p>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Brand *
            </label>
            <input
              type="text"
              name="brand"
              required
              defaultValue={editData?.brand || ""}
              placeholder="e.g., MIDAS, ADCP, SonTek"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Model *
            </label>
            <input
              type="text"
              name="model"
              required
              defaultValue={editData?.model || ""}
              placeholder="e.g., 3000, WorkHorse 600kHz"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Sensor Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Sensor Type *
            </label>
            <Dropdown
              items={sensorTypeOptions}
              selectedItem={selectedSensorType}
              onItemChange={(item) => setSelectedSensorType(item.id || item)}
              placeholder={
                loadingTypes ? "Loading sensor types..." : "Select sensor type"
              }
              className="w-full"
              getItemKey={(item) => item.id}
              renderSelectedItem={(item) => (
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.name}
                </span>
              )}
              renderItem={(item, isSelected) => (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-gray-600 dark:text-gray-300 text-sm">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="text-blue-600 dark:text-white">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="3"
              defaultValue={editData?.description || ""}
              placeholder="Enter sensor description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-white bg-red-600 border border-red-500 rounded-xl hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            {isEditMode ? "Update Sensor" : "Add Sensor"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SensorModal;
