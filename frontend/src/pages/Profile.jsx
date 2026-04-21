import React, { useState, useEffect, useRef } from "react";
import useTitle from "../hooks/useTitle";
import { Title, Modal, LoadingScreen } from "../components/ui";
import { API_ENDPOINTS } from "../config";
import useNotify from "../hooks/useNotify";
import useTranslation from "../hooks/useTranslation";
import useAuth from "../hooks/useAuth";
import { ProfileCard, DeleteAccountCard, ChangePasswordModal } from "../components/Widgets/Profile";

const Profile = () => {
  const { t } = useTranslation();
  useTitle(t("pages.profile.title"));
  const notify = useNotify();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Inline username edit
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const saveTimerRef = useRef(null);

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
      setUsername(userData.username || "");
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

  // Handle photo change (select only — no upload endpoint yet)
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Auto-save username on change (debounced)
  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveUsername(val);
    }, 1200);
  };

  const saveUsername = async (val) => {
    if (!val.trim() || val === user?.username) return;
    setSaving(true);
    setSavedIndicator(false);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: val }),
      });
      if (!response.ok) throw new Error();
      const updatedUser = await response.json();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2500);
    } catch {
      // silent — no disruptive error for autosave
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("pages.profile.passwordChangeError"));
      }

      setIsPasswordModalOpen(false);
      await notify.success(t("pages.profile.passwordChangeSuccess"), {
        title: t("pages.profile.passwordUpdatedTitle"),
        action: notify.ACTIONS.USER_UPDATED,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || t("pages.profile.passwordChangeError") };
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(API_ENDPOINTS.USERS.DELETE(user.id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      setIsDeleteModalOpen(false);
      await logout();
    } catch {
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) return <LoadingScreen />;

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

  if (!user) return null;

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="max-w-3xl mx-auto">
        <Title
          title={t("pages.profile.title")}
          subtitle={t("pages.profile.subtitle")}
        />

        <ProfileCard
          user={user}
          username={username}
          saving={saving}
          savedIndicator={savedIndicator}
          photoPreview={photoPreview}
          fileInputRef={fileInputRef}
          onUsernameChange={handleUsernameChange}
          onPhotoChange={handlePhotoChange}
          onPasswordModalOpen={() => setIsPasswordModalOpen(true)}
        />

        <DeleteAccountCard onDeleteClick={() => setIsDeleteModalOpen(true)} />
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onChangePassword={handlePasswordChange}
      />

      {/* Delete Account Confirm Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t("pages.profile.deleteAccount")}
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("pages.profile.deleteAccountConfirm")}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            {t("pages.profile.cancel")}
          </button>
          <button
            onClick={handleDeleteAccount}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t("pages.profile.deleteAccount")}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
