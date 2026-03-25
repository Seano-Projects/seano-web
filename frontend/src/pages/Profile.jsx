import React, { useState, useEffect, useRef } from "react";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import { API_ENDPOINTS } from "../config";
import { Modal } from "../components/ui";
import { LoadingScreen } from "../components/ui";
import useNotify from "../hooks/useNotify";
import useTranslation from "../hooks/useTranslation";
import {
  FaCamera,
  FaUser,
  FaEnvelope,
  FaShieldAlt,
  FaCalendarAlt,
} from "react-icons/fa";

const Profile = () => {
  const { t } = useTranslation();
  useTitle(t("pages.profile.title"));
  const notify = useNotify();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError(t("pages.profile.notAuthenticated"));
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(t("pages.profile.fetchError"));
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      setError(err.message || t("pages.profile.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Get initials for avatar
  const getInitials = (username, email) => {
    if (username) {
      return username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  // Handle photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError(t("pages.profile.imageFileOnly"));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(t("pages.profile.imageTooLarge"));
        return;
      }
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo upload submit
  const handlePhotoUpload = async () => {
    if (!photoPreview) return;

    setUploading(true);
    setError("");

    try {
      // TODO: Implement photo upload endpoint
      // For now, just show success message
      setTimeout(async () => {
        setUploading(false);
        setIsPhotoModalOpen(false);
        setPhotoPreview(null);
        // Show success message
        await notify.success(t("pages.profile.photoUpdateSuccess"), {
          title: t("pages.profile.photoUpdatedTitle"),
          action: notify.ACTIONS.USER_UPDATED,
        });
      }, 1000);
    } catch (err) {
      setError(err.message || t("pages.profile.photoUploadError"));
      setUploading(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (formData) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || t("pages.profile.profileUpdateError"),
        );
      }

      const updatedUser = await response.json();
      // Update user state and localStorage
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditModalOpen(false);
      // Refresh user data to ensure consistency
      await fetchUserData();

      // Show success notification
      await notify.success(t("pages.profile.profileUpdateSuccess"), {
        title: t("pages.profile.profileUpdatedTitle"),
        action: notify.ACTIONS.USER_UPDATED,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || t("pages.profile.profileUpdateError"),
      };
    }
  };

  // Handle password change
  const handlePasswordChange = async (currentPassword, newPassword) => {
    try {
      // TODO: Implement password change endpoint
      // For now, use update user endpoint
      const token = localStorage.getItem("access_token");
      const response = await fetch(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || t("pages.profile.passwordChangeError"),
        );
      }

      setIsPasswordModalOpen(false);

      // Show success notification
      await notify.success(t("pages.profile.passwordChangeSuccess"), {
        title: t("pages.profile.passwordUpdatedTitle"),
        action: notify.ACTIONS.USER_UPDATED,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message || t("pages.profile.passwordChangeError"),
      };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return t("pages.profile.notAvailable");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error && !user) {
    return (
      <div className="px-4 pt-4">
        <Title title={t("pages.profile.title")} subtitle="" />
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mt-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 pt-4">
        <Title title={t("pages.profile.title")} subtitle="" />
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mt-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t("pages.profile.noUserData")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden px-4 pt-4 pb-8">
      <div className="pointer-events-none absolute -top-20 -left-24 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-600/10" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl dark:bg-blue-600/10" />

      <div className="relative">
        <Title
          title={t("pages.profile.title")}
          subtitle={t("pages.profile.subtitle")}
        />

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Card - Left Side */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-lg shadow-slate-200/50 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-cyan-500 text-4xl font-bold text-white shadow-xl shadow-blue-500/25">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={t("pages.profile.altProfile")}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(user.username, user.email)
                    )}
                  </div>
                  <button
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-fourth p-2 text-white shadow-lg transition-colors hover:bg-blue-700 dark:border-slate-900"
                    title={t("pages.profile.changePhoto")}
                  >
                    <FaCamera size={14} />
                  </button>
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {user.username ||
                    user.email?.split("@")[0] ||
                    t("pages.profile.defaultUser")}
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {user.email}
                </p>

                <div className="mt-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      user.is_verified
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {user.is_verified
                      ? t("pages.profile.verified")
                      : t("pages.profile.pendingVerification")}
                  </span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <FaShieldAlt className="text-fourth" size={14} />
                    {t("pages.profile.role")}
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {user.role || t("pages.profile.noRole")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <FaCalendarAlt className="text-fourth" size={14} />
                    {t("pages.profile.memberSince")}
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details - Right Side */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-lg shadow-slate-200/50 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {t("pages.profile.profileInformation")}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="rounded-xl bg-fourth px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
                >
                  {t("pages.profile.editProfile")}
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <FaUser size={14} />
                    {t("pages.profile.username")}
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.username || t("pages.profile.notSet")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <FaEnvelope size={14} />
                    {t("pages.profile.email")}
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <FaShieldAlt size={14} />
                    {t("pages.profile.password")}
                  </label>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="font-medium tracking-[0.2em] text-gray-900 dark:text-white">
                      ••••••••
                    </p>
                    <button
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-fourth transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-700"
                    >
                      {t("pages.profile.changePassword")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onUpdate={handleProfileUpdate}
        t={t}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onChangePassword={handlePasswordChange}
        t={t}
      />

      {/* Upload Photo Modal */}
      <UploadPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setPhotoPreview(null);
        }}
        photoPreview={photoPreview}
        onPhotoChange={handlePhotoChange}
        onUpload={handlePhotoUpload}
        uploading={uploading}
        t={t}
      />
    </div>
  );
};

// Edit Profile Modal Component
const EditProfileModal = ({ isOpen, onClose, user, onUpdate, t }) => {
  const [formData, setFormData] = useState({
    username: user?.username || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await onUpdate(formData);
    if (!result.success) {
      setError(result.error || t("pages.profile.profileUpdateError"));
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("pages.profile.editModalTitle")}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              {t("pages.profile.usernameRequired")}
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              placeholder={t("pages.profile.usernamePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              {t("pages.profile.email")}
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("pages.profile.emailReadonly")}
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white bg-red-600 border border-red-500 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {t("pages.profile.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading
              ? t("pages.profile.updating")
              : t("pages.profile.updateProfile")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Change Password Modal Component
const ChangePasswordModal = ({ isOpen, onClose, onChangePassword, t }) => {
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

    // Validation
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

    const result = await onChangePassword(
      formData.currentPassword,
      formData.newPassword,
    );
    if (!result.success) {
      setError(result.error || t("pages.profile.passwordChangeError"));
      setLoading(false);
    } else {
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("pages.profile.passwordModalTitle")}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              {t("pages.profile.currentPassword")}
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              required
              placeholder={t("pages.profile.currentPasswordPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              {t("pages.profile.newPassword")}
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              required
              placeholder={t("pages.profile.newPasswordPlaceholder")}
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              {t("pages.profile.confirmNewPassword")}
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              placeholder={t("pages.profile.confirmPasswordPlaceholder")}
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white bg-red-600 border border-red-500 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {t("pages.profile.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading
              ? t("pages.profile.changing")
              : t("pages.profile.changePassword")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Upload Photo Modal Component
const UploadPhotoModal = ({
  isOpen,
  onClose,
  photoPreview,
  onPhotoChange,
  onUpload,
  uploading,
  t,
}) => {
  const fileInputRef = useRef(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("pages.profile.photoModalTitle")}
      size="md"
    >
      <div className="space-y-4">
        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full bg-linear-to-br from-fourth to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={t("pages.profile.altPreview")}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <FaUser size={48} />
            )}
          </div>
        </div>

        {/* File Input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {photoPreview
              ? t("pages.profile.changePhoto")
              : t("pages.profile.selectPhoto")}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {t("pages.profile.supportedFormats")}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-2 text-white bg-red-600 border border-red-500 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {t("pages.profile.cancel")}
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={!photoPreview || uploading}
            className="flex-1 px-4 py-2 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading
              ? t("pages.profile.uploading")
              : t("pages.profile.uploadPhoto")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Profile;
