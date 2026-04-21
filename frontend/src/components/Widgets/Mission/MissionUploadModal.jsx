import { useState, useEffect } from "react";
import { Modal } from "../../ui";
import { Dropdown } from "../";

const MissionUploadModal = ({
  isOpen,
  onClose,
  onConfirm,
  missionData,
  uploadState,
  vehicleInfo,
  vehicles = [],
  selectedVehicleId,
  onVehicleSelect,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find((v) => v.id === parseInt(selectedVehicleId));
      setSelectedVehicle(vehicle);
    }
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    // Auto close on success after 2 seconds
    if (uploadState.success && uploadState.currentStep === "complete") {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadState.success, uploadState.currentStep, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) {
      alert("Please select a vehicle");
      return;
    }
    if (!missionData) {
      alert("No mission data available");
      return;
    }

    try {
      await onConfirm(selectedVehicle.id);
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const handleClose = () => {
    if (!uploadState.isUploading) {
      setSelectedVehicle(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Mission to Vehicle"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Select Vehicle *
            </label>
            <Dropdown
              items={vehicles}
              selectedItem={selectedVehicle}
              onItemChange={(vehicle) => {
                setSelectedVehicle(vehicle);
                onVehicleSelect(vehicle.id.toString());
              }}
              placeholder="Choose a vehicle"
              getItemKey={(item) => item.id}
              renderSelectedItem={(vehicle) => (
                <span className="font-medium text-gray-900 dark:text-white">
                  {vehicle.name} ({vehicle.code})
                </span>
              )}
              renderItem={(vehicle, isSelected) => (
                <>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium">
                      {vehicle.name}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-sm">
                      {vehicle.code} • {vehicle.status}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="text-[#018190] dark:text-white">
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
                </>
              )}
            />
          </div>

          {/* Mission Info Display */}
          {missionData && (
            <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  MISSION NAME
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {missionData.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  WAYPOINTS
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {missionData.waypoints?.length || 0} waypoint(s) including home
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadState.isUploading && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Uploading...
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {uploadState.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-[#018190] transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  ></div>
                </div>
              </div>

              {uploadState.currentStep && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {uploadState.currentStep === "validating"
                    ? "Validating mission..."
                    : uploadState.currentStep === "uploading"
                      ? "Uploading to vehicle..."
                      : "Processing..."}
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {uploadState.error && !uploadState.isUploading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                {uploadState.error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {uploadState.success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Mission uploaded successfully!
              </p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadState.isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploadState.isUploading || uploadState.success}
            className="px-4 py-2 text-sm font-medium text-white bg-[#018190] hover:bg-[#016673] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadState.isUploading
              ? "Uploading..."
              : uploadState.success
                ? "Done"
                : "Upload Mission"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MissionUploadModal;
