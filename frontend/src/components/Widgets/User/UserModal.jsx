import { useState } from "react";
import { Modal } from "../../ui";

const UserModal = ({ isOpen, onClose, onSubmit }) => {
  const [fieldError, setFieldError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const userData = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const result = await onSubmit(userData);

    if (result?.success === false) {
      const message = (result.error || "").toLowerCase();
      if (message.includes("username")) {
        setFieldError({ field: "username", message: result.error });
      } else if (message.includes("email")) {
        setFieldError({ field: "email", message: result.error });
      }
      return;
    }

    setFieldError(null);
    e.target.reset();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New User" size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="user-username"
              className="block text-sm font-medium text-gray-700 dark:text-white mb-1"
            >
              Username *
            </label>
            <input
              id="user-username"
              type="text"
              name="username"
              required
              autoComplete="username"
              placeholder="Enter username"
              onChange={() =>
                fieldError?.field === "username" && setFieldError(null)
              }
              className={`w-full px-3 py-2 border rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:border-transparent ${
                fieldError?.field === "username"
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-slate-600 focus:ring-fourth"
              }`}
            />
            {fieldError?.field === "username" && (
              <p className="text-xs text-red-500 mt-1">{fieldError.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="user-email"
              className="block text-sm font-medium text-gray-700 dark:text-white mb-1"
            >
              Email *
            </label>
            <input
              id="user-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Enter email address"
              onChange={() =>
                fieldError?.field === "email" && setFieldError(null)
              }
              className={`w-full px-3 py-2 border rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:border-transparent ${
                fieldError?.field === "email"
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-slate-600 focus:ring-fourth"
              }`}
            />
            {fieldError?.field === "email" && (
              <p className="text-xs text-red-500 mt-1">{fieldError.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="user-password"
              className="block text-sm font-medium text-gray-700 dark:text-white mb-1"
            >
              Password *
            </label>
            <input
              id="user-password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="Enter password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Active Status (Disabled) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Status
            </label>
            <input
              type="text"
              value="Active"
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-400 cursor-not-allowed"
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
            Add User
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
