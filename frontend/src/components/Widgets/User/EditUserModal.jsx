import { useState, useEffect } from "react";
import { Modal } from "../../ui";
import Dropdown from "../Dropdown";

const EditUserModal = ({ isOpen, onClose, onSubmit, user, roleData = [] }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role_id: null,
  });

  useEffect(() => {
    if (isOpen && user) {
      const userData = user.originalUser || user;
      setFormData({
        username: userData.username || "",
        email: userData.email || "",
        role_id: userData.role_id ? Number(userData.role_id) : null,
      });
    }
  }, [isOpen, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({ username: "", email: "", role_id: null });
    onClose();
  };

  const selectedRole = roleData.find((r) => r.id === formData.role_id) || null;

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit User" size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="edit-user-username"
              className="block text-sm font-medium text-gray-700 dark:text-white mb-1"
            >
              Username *
            </label>
            <input
              id="edit-user-username"
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              autoComplete="username"
              placeholder="Enter username"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label
              htmlFor="edit-user-email"
              className="block text-sm font-medium text-gray-700 dark:text-white mb-1"
            >
              Email
            </label>
            <input
              id="edit-user-email"
              type="email"
              value={formData.email}
              disabled
              aria-disabled="true"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Role */}
          {roleData.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                Role
              </label>
              <Dropdown
                items={roleData}
                selectedItem={selectedRole}
                onItemChange={(role) =>
                  setFormData({ ...formData, role_id: role.id })
                }
                placeholder="Select role"
                getItemKey={(item) => item.id}
              />
            </div>
          )}
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
            Update User
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
