import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaBatteryFull,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaWifi,
  FaLock,
  FaRocket,
  FaClock,
  FaShip,
  FaClipboardList,
  FaTachometerAlt,
  FaChevronDown,
} from "react-icons/fa";
import Dropdown from "../Dropdown";

const MissionUploadModal = ({
  isOpen,
  onClose,
  onConfirm,
  missionData,
  vehicleState,
  uploadState,
  vehicleInfo,
  vehicles = [],
  selectedVehicleId,
  onVehicleSelect,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [overrideSafety, setOverrideSafety] = useState(false);
  const [showConfirmOverride, setShowConfirmOverride] = useState(false);

  useEffect(() => {
    // Auto close on success after 2 seconds
    if (uploadState.success && uploadState.currentStep === "complete") {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadState.success, uploadState.currentStep, onClose]);

  useEffect(() => {
    // Reset override when modal closes or vehicle changes
    if (!isOpen) {
      setOverrideSafety(false);
      setShowConfirmOverride(false);
    }
  }, [isOpen, selectedVehicleId]);

  const handleOverrideChange = (e) => {
    if (e.target.checked) {
      setShowConfirmOverride(true);
    } else {
      setOverrideSafety(false);
    }
  };

  const handleConfirmOverride = () => {
    setOverrideSafety(true);
    setShowConfirmOverride(false);
  };

  const handleCancelOverride = () => {
    setOverrideSafety(false);
    setShowConfirmOverride(false);
  };

  if (!isOpen) return null;

  const getBatteryIcon = (level) => {
    if (level >= 60)
      return (
        <FaBatteryFull
          className="text-green-600 dark:text-green-400"
          size={16}
        />
      );
    if (level >= 30)
      return (
        <FaBatteryHalf
          className="text-yellow-600 dark:text-yellow-400"
          size={16}
        />
      );
    return (
      <FaBatteryQuarter className="text-red-600 dark:text-red-400" size={16} />
    );
  };

  const renderVehicleStatus = () => (
    <div className="bg-white dark:bg-black rounded-2xl p-4 border border-gray-200 dark:border-slate-600">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 font-openSans">
        <FaTachometerAlt className="text-[#018190]" size={14} />
        Vehicle Status
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-gray-200 dark:border-slate-600">
          <div
            className={`p-2 rounded-lg ${
              vehicleState.isConnected
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            }`}
          >
            <FaWifi
              className={
                vehicleState.isConnected
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
              size={16}
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-openSans">
              Connection
            </p>
            <p
              className={`text-sm font-bold font-openSans ${
                vehicleState.isConnected
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {vehicleState.isConnected ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Battery Level */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-gray-200 dark:border-slate-600">
          <div
            className={`p-2 rounded-lg ${
              vehicleState.batteryLevel >= 60
                ? "bg-green-100 dark:bg-green-900/30"
                : vehicleState.batteryLevel >= 30
                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
            }`}
          >
            {getBatteryIcon(vehicleState.batteryLevel || 0)}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-openSans">
              Battery
            </p>
            <p
              className={`text-sm font-bold font-openSans ${
                vehicleState.batteryLevel >= 20
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {vehicleState.batteryLevel || 0}%
            </p>
          </div>
        </div>

        {/* Armed State */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-gray-200 dark:border-slate-600">
          <div
            className={`p-2 rounded-lg ${
              vehicleState.armedState === "armed"
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            }`}
          >
            <FaLock
              className={
                vehicleState.armedState === "armed"
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }
              size={16}
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-openSans">
              Armed
            </p>
            <p
              className={`text-sm font-bold font-openSans ${
                vehicleState.armedState === "armed"
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {vehicleState.armedState || "Unknown"}
            </p>
          </div>
        </div>

        {/* Flight Mode */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-gray-200 dark:border-slate-600">
          <div className="p-2 rounded-lg bg-[#018190]/10 dark:bg-[#018190]/20">
            <FaRocket className="text-[#018190]" size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-openSans">
              Mode
            </p>
            <p className="text-sm font-bold text-gray-800 dark:text-white font-openSans">
              {vehicleState.flightMode || "Unknown"}
            </p>
          </div>
        </div>
      </div>

      {/* Last Seen */}
      {vehicleState.lastSeen && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
          <FaClock className="text-gray-400" size={12} />
          <p className="text-xs text-gray-500 dark:text-gray-400 font-openSans">
            Last seen: {new Date(vehicleState.lastSeen).toLocaleString("id-ID")}
          </p>
        </div>
      )}
    </div>
  );

  const renderSafetyChecks = () => {
    if (!vehicleState.checks) return null;

    const checks = [
      {
        label: "Vehicle Online",
        passed: vehicleState.checks.isOnline,
        icon: FaWifi,
      },
      {
        label: "Battery Level OK (≥20%)",
        passed: vehicleState.checks.batteryOk,
        icon: FaBatteryFull,
      },
      {
        label: "Vehicle Not Armed",
        passed: vehicleState.checks.notArmed,
        icon: FaLock,
      },
      {
        label: "No Active Mission",
        passed: vehicleState.checks.noActiveMission,
        icon: FaRocket,
      },
      {
        label: "Recently Active",
        passed: vehicleState.checks.recentlyActive,
        icon: FaClock,
      },
    ];

    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-2xl p-4 border border-gray-200 dark:border-slate-600 space-y-3 animate-in slide-in-from-top duration-300">
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 font-openSans">
          <FaCheckCircle className="text-green-600" size={14} />
          Safety Checks
        </h4>
        <div className="space-y-2">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                check.passed
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${
                  check.passed
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                {check.passed ? (
                  <FaCheckCircle
                    className="text-green-600 dark:text-green-400"
                    size={14}
                  />
                ) : (
                  <FaExclamationTriangle
                    className="text-red-600 dark:text-red-400"
                    size={14}
                  />
                )}
              </div>
              <span
                className={`text-sm font-medium flex-1 font-openSans ${
                  check.passed
                    ? "text-green-800 dark:text-green-300"
                    : "text-red-800 dark:text-red-300"
                }`}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUploadProgress = () => (
    <div className="space-y-5">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-base font-bold text-gray-800 dark:text-gray-200 font-openSans">
            {uploadState.currentStep === "complete"
              ? "✓ Upload Complete"
              : "⏳ Uploading..."}
          </span>
          <span className="text-lg font-bold text-orange-600 dark:text-orange-400 font-openSans">
            {uploadState.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              uploadState.currentStep === "complete"
                ? "bg-gradient-to-r from-green-500 to-green-600"
                : uploadState.error
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : "bg-[#018190] animate-pulse"
            }`}
            style={{ width: `${uploadState.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Status Message */}
      <div
        className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${
          uploadState.error
            ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-300 dark:border-red-800"
            : uploadState.success
              ? "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-300 dark:border-green-800"
              : "bg-gradient-to-r from-[#018190]/10 to-[#018190]/20 dark:from-[#018190]/30 dark:to-[#018190]/20 border-[#018190]/30 dark:border-[#018190]/50"
        }`}
      >
        <div
          className={`p-3 rounded-xl ${
            uploadState.error
              ? "bg-red-100 dark:bg-red-900/40"
              : uploadState.success
                ? "bg-green-100 dark:bg-green-900/40"
                : "bg-[#018190]/20 dark:bg-[#018190]/30"
          }`}
        >
          {uploadState.error ? (
            <FaExclamationTriangle
              className="text-red-600 dark:text-red-400"
              size={24}
            />
          ) : uploadState.success ? (
            <FaCheckCircle
              className="text-green-600 dark:text-green-400"
              size={24}
            />
          ) : (
            <FaSpinner
              className="text-[#018190] dark:text-white animate-spin"
              size={24}
            />
          )}
        </div>
        <p
          className={`text-sm font-medium flex-1 font-openSans ${
            uploadState.error
              ? "text-red-800 dark:text-red-300"
              : uploadState.success
                ? "text-green-800 dark:text-green-300"
                : "text-[#018190] dark:text-white"
          }`}
        >
          {uploadState.error ||
            (uploadState.success
              ? "Mission uploaded successfully!"
              : uploadState.currentStep === "checking"
                ? "Checking vehicle status..."
                : uploadState.currentStep === "validating"
                  ? "Validating mission data..."
                  : uploadState.currentStep === "uploading"
                    ? "Uploading mission to vehicle..."
                    : uploadState.currentStep === "verifying"
                      ? "Verifying reception..."
                      : "Preparing...")}
        </p>
      </div>

      {/* Upload Steps */}
      {!uploadState.error && !uploadState.success && (
        <div className="grid grid-cols-4 gap-2">
          {["checking", "validating", "uploading", "verifying"].map(
            (step, idx) => (
              <div
                key={step}
                className={`text-center p-3 rounded-xl transition-all border-2 ${
                  uploadState.currentStep === step
                    ? "bg-gradient-to-br from-[#018190]/20 to-[#018190]/30 dark:from-[#018190]/40 dark:to-[#018190]/30 border-[#018190] dark:border-[#018190]/80 shadow-sm scale-105"
                    : uploadState.progress > (idx + 1) * 25
                      ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/30 border-green-400 dark:border-green-600"
                      : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                }`}
              >
                <p
                  className={`text-xs font-bold font-openSans ${
                    uploadState.currentStep === step
                      ? "text-[#018190] dark:text-white"
                      : uploadState.progress > (idx + 1) * 25
                        ? "text-green-700 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-openSans">
      <div className="bg-white dark:bg-black rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-blue-500 p-6">
          <div className="pr-8">
            <h3 className="text-2xl font-bold text-white mb-1 font-openSans">
              {uploadState.isUploading
                ? "Uploading Mission"
                : "Upload Mission to Vehicle"}
            </h3>
            <p className="text-white/80 text-sm font-openSans">
              {vehicleInfo?.name || "Select vehicle to continue"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploadState.isUploading}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {uploadState.isUploading ? (
            // Upload in Progress
            renderUploadProgress()
          ) : (
            <>
              {/* Vehicle Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-openSans flex items-center gap-2">
                  <FaShip className="text-[#018190]" size={14} />
                  Select Vehicle
                </label>
                <Dropdown
                  items={vehicles}
                  selectedItem={
                    selectedVehicleId
                      ? vehicles.find(
                          (v) => v.id === parseInt(selectedVehicleId),
                        )
                      : null
                  }
                  onItemChange={(vehicle) =>
                    onVehicleSelect(vehicle.id.toString())
                  }
                  placeholder="Choose a vehicle"
                  getItemKey={(item) => item.id}
                  renderSelectedItem={(vehicle) => (
                    <span className="font-medium text-gray-900 dark:text-white font-openSans">
                      {vehicle.name} ({vehicle.code})
                    </span>
                  )}
                  renderItem={(vehicle, isSelected) => (
                    <>
                      <div className="flex-1">
                        <div className="text-gray-900 dark:text-white font-medium font-openSans">
                          {vehicle.name}
                        </div>
                        <div className="text-gray-600 dark:text-gray-300 text-sm font-openSans">
                          {vehicle.code} • {vehicle.status}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-[#018190] dark:text-white">
                          <FaCheckCircle size={16} />
                        </div>
                      )}
                    </>
                  )}
                />
                {selectedVehicleId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-openSans">
                    <FaCheckCircle className="text-green-500" size={12} />
                    Vehicle status checked automatically
                  </p>
                )}
              </div>

              {/* Mission Info */}
              <div className="bg-white dark:bg-black rounded-2xl p-4 border border-[#018190]/30 dark:border-[#018190]/40">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 font-openSans">
                  <FaClipboardList className="text-[#018190]" size={14} />
                  Mission: {missionData?.name}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-openSans">
                      Waypoints
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white font-openSans">
                      {missionData?.waypoints?.length || 0}
                    </p>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-openSans">
                      Home Location
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white font-openSans">
                      {missionData?.home_location ? "✓ Set" : "✗ Not Set"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Status - only show if vehicle selected */}
              {selectedVehicleId && renderVehicleStatus()}

              {/* Warning if vehicle selected but not ready - MOVED HERE FOR VISIBILITY */}
              {selectedVehicleId &&
                (!vehicleState.isConnected ||
                  (vehicleState.batteryLevel !== undefined &&
                    vehicleState.batteryLevel < 20) ||
                  vehicleState.armedState === "armed" ||
                  (vehicleState.checks && !vehicleState.isReady)) && (
                  <div className="bg-white dark:bg-black border-2 border-yellow-300 dark:border-yellow-700 rounded-2xl p-4 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <FaExclamationTriangle
                          className="text-yellow-600 dark:text-yellow-400"
                          size={20}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-300 mb-1 font-openSans">
                          Vehicle Not Ready
                        </h4>
                        <p className="text-sm text-yellow-800 dark:text-yellow-400 font-openSans mb-3">
                          The vehicle is not ready to receive a mission. Please
                          check the vehicle status and safety checks above.
                        </p>

                        {/* Override Safety Checks Checkbox */}
                        <label className="flex items-start gap-3 p-3 bg-white dark:bg-black rounded-lg border border-yellow-300 dark:border-yellow-600 cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">
                          <input
                            type="checkbox"
                            checked={overrideSafety}
                            onChange={handleOverrideChange}
                            className="mt-0.5 w-4 h-4 rounded border-yellow-400 dark:border-yellow-600 bg-white dark:bg-slate-700 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                          />
                          <div className="flex-1 items-center">
                            <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 font-openSans">
                              Override Safety Checks (Not Recommended)
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

              {/* Safety Checks */}
              {selectedVehicleId && showDetails && renderSafetyChecks()}

              {/* Show Details Toggle - only if vehicle selected */}
              {selectedVehicleId && vehicleState.checks && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#018190] hover:bg-[#016570] text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md font-openSans"
                  >
                    {showDetails ? (
                      <>
                        <FaCheckCircle size={14} />
                        Hide Safety Checks
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle size={14} />
                        Show Safety Checks
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!uploadState.isUploading && !uploadState.success && (
          <div className="flex gap-3 p-6 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-slate-600">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-white font-medium rounded-xl transition-all border-2 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 font-openSans"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(overrideSafety)}
              disabled={
                !selectedVehicleId || (!vehicleState.isReady && !overrideSafety)
              }
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all shadow-lg font-openSans flex items-center justify-center gap-2 ${
                selectedVehicleId && (vehicleState.isReady || overrideSafety)
                  ? overrideSafety && !vehicleState.isReady
                    ? "bg-red-600 hover:bg-red-700 text-white hover:shadow-xl"
                    : "bg-[#018190] hover:bg-[#016570] text-white hover:shadow-xl"
                  : "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60"
              }`}
            >
              {!selectedVehicleId ? (
                <>
                  <FaShip size={16} />
                  Select Vehicle First
                </>
              ) : overrideSafety && !vehicleState.isReady ? (
                <>
                  <FaExclamationTriangle size={16} />
                  Force Upload (Override)
                </>
              ) : (
                <>
                  <FaRocket size={16} />
                  Upload Mission
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Override */}
      {showConfirmOverride &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-openSans">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FaExclamationTriangle className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white font-openSans">
                    Confirm Safety Override
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-gray-800 dark:text-gray-200 font-openSans">
                  Are you sure you want to{" "}
                  <span className="font-bold text-red-600 dark:text-red-400">
                    override safety checks
                  </span>{" "}
                  and force upload the mission?
                </p>

                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-300 mb-2 font-openSans flex items-center gap-2">
                    <FaExclamationTriangle size={14} />
                    Warning
                  </h4>
                  <ul className="text-xs text-red-800 dark:text-red-300 space-y-1 font-openSans list-disc list-inside">
                    <li>Vehicle may not be able to execute the mission</li>
                    <li>Risk of mission failure or vehicle damage</li>
                    <li>Low battery may cause vehicle to be stranded</li>
                    <li>Offline vehicle will not receive commands</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 font-openSans">
                  This action should only be used in{" "}
                  <span className="font-semibold">emergency situations</span> or
                  for <span className="font-semibold">testing purposes</span>.
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-600 rounded-b-2xl">
                <button
                  onClick={handleCancelOverride}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-white font-medium rounded-xl transition-all border-2 border-gray-300 dark:border-slate-600 font-openSans"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOverride}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl font-openSans flex items-center justify-center gap-2"
                >
                  <FaExclamationTriangle size={16} />
                  Yes, Override
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>,
    document.body,
  );
};

export default MissionUploadModal;
