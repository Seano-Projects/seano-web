import React, { useState, useEffect } from "react";
import { toast, LoadingDots } from "../../ui";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import axiosInstance from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";
import { WizardModal } from "../../ui";

const AddVehicleWizard = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    selectedSensors: [],
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        name: "",
        code: "",
        description: "",
        selectedSensors: [],
      });
      fetchSensors();
    }
  }, [isOpen]);

  const fetchSensors = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SENSORS.LIST);
      setAvailableSensors(response.data);
    } catch (error) {
      toast.error("Failed to load sensors");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSensorToggle = (sensorId) => {
    setFormData((prev) => ({
      ...prev,
      selectedSensors: prev.selectedSensors.includes(sensorId)
        ? prev.selectedSensors.filter((id) => id !== sensorId)
        : [...prev.selectedSensors, sensorId],
    }));
  };

  const handleNext = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and Code are required");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const vehicleResponse = await axiosInstance.post(
        API_ENDPOINTS.VEHICLES.CREATE,
        {
          name: formData.name,
          code: formData.code,
          description: formData.description,
        },
      );

      const newVehicleId = vehicleResponse.data.id;

      if (formData.selectedSensors.length > 0) {
        const assignPromises = formData.selectedSensors.map((sensorId) =>
          axiosInstance.post(
            API_ENDPOINTS.VEHICLES.ASSIGN_SENSOR(newVehicleId),
            {
              sensor_id: sensorId,
            },
          ),
        );
        await Promise.all(assignPromises);
      }

      toast.success("Vehicle created successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to create vehicle";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderFooter = () => (
    <>
      {step === 1 ? (
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!formData.name.trim() || !formData.code.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleBack}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingDots size="sm" color="white" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Vehicle
              </>
            )}
          </button>
        </>
      )}
    </>
  );

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Vehicle"
      currentStep={step}
      totalSteps={2}
      footer={renderFooter()}
    >
      {step === 1 ? (
        <div className="space-y-4">
          {/* Vehicle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Vehicle Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g. USV Patrol Alpha"
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent [&:-webkit-autofill]:!bg-white [&:-webkit-autofill]:dark:!bg-slate-900"
            />
          </div>

          {/* Registration Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Registration Code *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              required
              placeholder="e.g. USV-001"
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Describe the vehicle's purpose and configuration..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent resize-none"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              Assign Sensors
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select sensors to install on this vehicle (optional)
            </p>
          </div>

          {availableSensors.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
              <p>No sensors available</p>
              <p className="text-sm mt-1">
                Register sensors first to assign them
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
              {availableSensors.map((sensor) => (
                <div
                  key={sensor.id}
                  onClick={() => handleSensorToggle(sensor.id)}
                  className={`
                    relative flex items-start p-4 rounded-xl border cursor-pointer transition-all
                    ${
                      formData.selectedSensors.includes(sensor.id)
                        ? "border-fourth bg-blue-50 dark:bg-blue-900/20 ring-2 ring-fourth"
                        : "border-gray-300 dark:border-slate-600 hover:border-fourth dark:hover:border-fourth"
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {sensor.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-mono">
                        {sensor.code}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {sensor.description || "No description"}
                    </p>
                  </div>

                  <div
                    className={`
                      w-5 h-5 rounded border flex items-center justify-center ml-3 transition-colors
                      ${
                        formData.selectedSensors.includes(sensor.id)
                          ? "bg-fourth border-fourth"
                          : "border-gray-300 dark:border-slate-600"
                      }
                    `}
                  >
                    {formData.selectedSensors.includes(sensor.id) && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WizardModal>
  );
};

export default AddVehicleWizard;
