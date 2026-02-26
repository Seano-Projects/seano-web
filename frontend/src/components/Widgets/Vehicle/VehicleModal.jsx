import { useState, useEffect } from "react";
import { Modal } from "../../ui";
import { Dropdown } from "../";
import { useAuthContext } from "../../../hooks/useAuthContext";

const VehicleModal = ({ isOpen, onClose, onSubmit, editData = null }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "idle",
  });

  // Status options
  const statusOptions = [
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
        status: editData.statusRaw || editData.status || "idle",
      };
      setFormData(newFormData);
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        status: "idle",
      });
    }
  }, [editData, isOpen]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);


    const vehicleData = {
      name: formData.name,
      code: formData.code,
      description: formData.description || null,
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
      status: "idle",
    });
    onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editData ? "Edit Vehicle" : "Add New Vehicle"}
      size="md"
    >
      <form onSubmit={handleSubmit}>
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
              placeholder="Enter vehicle description"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent resize-none"
            />
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
