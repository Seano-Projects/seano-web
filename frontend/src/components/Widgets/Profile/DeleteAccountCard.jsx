import React from "react";
import useTranslation from "../../../hooks/useTranslation";

const DeleteAccountCard = ({ onDeleteClick }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm dark:border-slate-700 dark:bg-black">
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
        {t("pages.profile.deleteAccount")}
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {t("pages.profile.deleteAccountDesc")}
      </p>
      <button
        onClick={onDeleteClick}
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        {t("pages.profile.deleteAccount")}
      </button>
    </div>
  );
};

export default DeleteAccountCard;
