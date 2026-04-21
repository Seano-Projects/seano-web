import React from "react";
import { FaCamera, FaSpinner, FaCheckCircle } from "react-icons/fa";
import useTranslation from "../../../hooks/useTranslation";

const getInitials = (username, email) => {
  if (username) {
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "U";
};

const ProfileCard = ({
  user,
  username,
  saving,
  savedIndicator,
  photoPreview,
  fileInputRef,
  onUsernameChange,
  onPhotoChange,
  onPasswordModalOpen,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t("pages.profile.personalInfo")}
        </h2>
        <span className={`flex items-center gap-1.5 text-sm transition-opacity duration-300 ${saving || savedIndicator ? "opacity-100" : "opacity-0"}`}>
          {saving ? (
            <><FaSpinner className="animate-spin text-orange-400" size={13} /><span className="text-orange-400">{t("pages.profile.savingChanges")}</span></>
          ) : (
            <><FaCheckCircle className="text-emerald-500" size={13} /><span className="text-emerald-500">{t("pages.profile.saved")}</span></>
          )}
        </span>
      </div>

      {/* Body */}
      <div className="px-8 py-7">
        {/* Avatar */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fourth text-2xl font-bold text-white overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt={t("pages.profile.altProfile")} className="h-full w-full object-cover" />
              ) : (
                getInitials(user.username, user.email)
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-fourth text-white shadow-md hover:bg-blue-700 dark:border-slate-900"
              title={t("pages.profile.changePhoto")}
            >
              <FaCamera size={11} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Fields Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Username */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("pages.profile.username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={onUsernameChange}
              placeholder={t("pages.profile.usernamePlaceholder")}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-fourth focus:ring-2 focus:ring-fourth/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-fourth"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("pages.profile.email")}
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-gray-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/60 dark:text-gray-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("pages.profile.password")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value="••••••••"
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-gray-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/60 dark:text-gray-400"
              />
              <button
                onClick={onPasswordModalOpen}
                className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50 hover:text-fourth transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:text-fourth"
              >
                {t("pages.profile.changePassword")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
