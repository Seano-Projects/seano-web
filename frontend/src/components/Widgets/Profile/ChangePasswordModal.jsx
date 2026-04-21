import React, { useState } from "react";
import { Modal } from "../../ui";
import useTranslation from "../../../hooks/useTranslation";

const ChangePasswordModal = ({ isOpen, onClose, onChangePassword }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t("pages.profile.passwordMismatch"));
      setLoading(false);
      return;
    }
    if (formData.newPassword.length < 6) {
      setError(t("pages.profile.passwordMinLength"));
      setLoading(false);
      return;
    }

    const result = await onChangePassword(formData.currentPassword, formData.newPassword);
    if (!result.success) {
      setError(result.error || t("pages.profile.passwordChangeError"));
      setLoading(false);
    } else {
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("pages.profile.passwordModalTitle")} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
              {t("pages.profile.currentPassword")}
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              placeholder={t("pages.profile.currentPasswordPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-fourth focus:ring-2 focus:ring-fourth/20 focus:outline-none dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
              {t("pages.profile.newPassword")}
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              minLength={6}
              placeholder={t("pages.profile.newPasswordPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-fourth focus:ring-2 focus:ring-fourth/20 focus:outline-none dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
              {t("pages.profile.confirmNewPassword")}
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={6}
              placeholder={t("pages.profile.confirmPasswordPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-fourth focus:ring-2 focus:ring-fourth/20 focus:outline-none dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            {t("pages.profile.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-fourth px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("pages.profile.changing") : t("pages.profile.changePassword")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
