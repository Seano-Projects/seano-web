import { useState, useEffect } from "react";
import { Modal } from "../../ui";
import { Dropdown } from "../";
import { useAuthContext } from "../../../hooks/useAuthContext";
import axiosInstance from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";

const parseCapacity = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const numericValue = String(rawValue)
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");

  if (!numericValue) {
    return null;
  }

  const parsed = Number.parseFloat(numericValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const VehicleModal = ({ isOpen, onClose, onSubmit, editData = null }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    battery_count: "2",
    battery_total_capacity_ah: "20",
    status: "idle",
  });

  // Battery count options
  const batteryCountOptions = [
    { id: "1", name: "1 Battery" },
    { id: "2", name: "2 Battery" },
  ];

  // Status options
  const statusOptions = [
    {
      id: "online",
      name: "Online",
      description: "Vehicle is online and ready",
    },
    { id: "idle", name: "Idle", description: "Vehicle is not in use" },
    {
      id: "on_mission",
      name: "On Mission",
      description: "Vehicle is currently on a mission",
    },
    {
      id: "maintenance",
      name: "Maintenance",
      description: "Vehicle is under maintenance",
    },
    { id: "offline", name: "Offline", description: "Vehicle is offline" },
  ];

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      const newFormData = {
        name: editData.name || "",
        code: editData.code || "",
        description: editData.description || "",
        battery_count: editData.battery_count
          ? String(editData.battery_count)
          : "2",
        battery_total_capacity_ah: editData.battery_total_capacity_ah
          ? String(editData.battery_total_capacity_ah)
          : "20",
        status: editData.statusRaw || editData.status || "idle",
      };
      setFormData(newFormData);
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        battery_count: "2",
        battery_total_capacity_ah: "20",
        status: "idle",
      });
    }

    setApiKey("");
    setApiKeyError("");
    setApiKeyCopied(false);
  }, [editData, isOpen]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const parsedCapacity = parseCapacity(formData.battery_total_capacity_ah);
    const parsedBatteryCount = Number(formData.battery_count) === 1 ? 1 : 2;

    const vehicleData = {
      name: formData.name,
      code: formData.code,
      description: formData.description || null,
      battery_count: parsedBatteryCount,
      battery_total_capacity_ah:
        parsedCapacity && parsedCapacity > 0 ? parsedCapacity : 20,
      status: formData.status,
      user_id: user?.id || 1, // Use logged in user ID, default to 1
    };

    try {
      await onSubmit(vehicleData, editData?.id);

      // Close modal on success (parent will handle refresh)
      onClose();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      battery_count: "2",
      battery_total_capacity_ah: "20",
      status: "idle",
    });
    onClose();
  };

  const handleGenerateApiKey = async () => {
    if (!editData?.id) return;

    setApiKeyLoading(true);
    setApiKeyError("");
    setApiKeyCopied(false);

    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.VEHICLES.GENERATE_API_KEY(editData.id),
      );
      const generatedKey = response.data?.api_key;
      if (!generatedKey) {
        throw new Error("API key not returned");
      }
      setApiKey(generatedKey);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to generate API key";
      setApiKeyError(message);
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch (error) {
      setApiKeyCopied(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editData ? "Edit Vehicle" : "Add New Vehicle"}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
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
              placeholder="Enter vehicle name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Registration Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Registration Code {editData ? "" : "*"}
            </label>
            <input
              type="text"
              name="code"
              value={formData.code || ""}
              onChange={handleInputChange}
              required={!editData}
              readOnly={editData}
              placeholder={!editData ? "e.g. USV-003" : ""}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent ${
                editData
                  ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  : "bg-transparent"
              }`}
            />
            {editData && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Registration code cannot be changed
              </p>
            )}
          </div>

          {editData && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                Vehicle API Key
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateApiKey}
                  disabled={apiKeyLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-fourth hover:bg-blue-700 transition-colors rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {apiKeyLoading ? "Generating..." : "Generate API Key"}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {apiKeyCopied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              {apiKey && (
                <div className="mt-2 w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-slate-600">
                  <span className="block text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                    {apiKey}
                  </span>
                </div>
              )}
              {apiKeyError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {apiKeyError}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                API key only appears after generation. Save it on the USV.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generating a new key replaces the previous one.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Enter vehicle description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent resize-none"
            />
          </div>

          {/* Battery Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Jumlah Battery Unit *
            </label>
            <Dropdown
              items={batteryCountOptions}
              selectedItem={
                batteryCountOptions.find(
                  (b) => b.id === formData.battery_count,
                ) || batteryCountOptions[1]
              }
              onItemChange={(item) =>
                setFormData((prev) => ({ ...prev, battery_count: item.id }))
              }
              placeholder="Select battery count"
              getItemKey={(item) => item.id}
              renderSelectedItem={(item) => (
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.name}
                </span>
              )}
              renderItem={(item, isSelected) => (
                <>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium">
                      {item.name}
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

          {/* Total Battery Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Total Battery Capacity (Ah) *
            </label>
            <input
              type="text"
              name="battery_total_capacity_ah"
              value={formData.battery_total_capacity_ah}
              onChange={handleInputChange}
              required
              placeholder="e.g. 20"
              inputMode="decimal"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Isi angka saja, satuan Ah otomatis.
            </p>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Status *
            </label>
            <Dropdown
              items={statusOptions}
              selectedItem={
                statusOptions.find((s) => s.id === formData.status) ||
                statusOptions[0]
              }
              onItemChange={(status) =>
                setFormData((prev) => ({ ...prev, status: status.id }))
              }
              placeholder="Select status"
              getItemKey={(item) => item.id}
              renderSelectedItem={(status) => (
                <span className="font-medium text-gray-900 dark:text-white">
                  {status.name}
                </span>
              )}
              renderItem={(status, isSelected) => (
                <>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white font-medium">
                      {status.name}
                    </div>
                    {status.description && (
                      <div className="text-gray-600 dark:text-gray-300 text-sm">
                        {status.description}
                      </div>
                    )}
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
        </div>

        {/* Form Actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white bg-red-600 border border-red-500 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Saving..."
              : editData
                ? "Update Vehicle"
                : "Add Vehicle"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default VehicleModal;
