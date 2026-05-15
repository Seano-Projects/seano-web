import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { FaMoon, FaSun, FaEye, FaEyeSlash } from "react-icons/fa";
import SeanoLogo from "../../assets/logo_seano.webp";
import { LoadingDots, toast, LanguageToggle } from "../../components/ui";
import useTranslation from "../../hooks/useTranslation";
import axios from "axios";
import { API_ENDPOINTS } from "../../config";

export default function ResetPassword({ darkMode, toggleDarkMode }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error(t("auth.resetPassword.errors.fillAllFields"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.resetPassword.errors.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("auth.resetPassword.errors.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await axios.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
      toast.success(t("auth.resetPassword.success.message"), {
        title: t("auth.resetPassword.success.title"),
      });
      setTimeout(() => navigate("/auth/login"), 2000);
    } catch (err) {
      const msg =
        err.response?.data?.error || t("auth.resetPassword.errors.failed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-openSans ${darkMode ? "bg-black" : "bg-white"}`}>
        <div className="text-center space-y-4">
          <p className="text-gray-800 dark:text-gray-200 text-lg">{t("auth.resetPassword.errors.invalidToken")}</p>
          <Link to="/auth/login" className="text-blue-700 dark:text-blue-400 font-semibold underline">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen grid grid-cols-1 bg-linear-to-br font-openSans ${darkMode ? "bg-black" : "bg-white"}`}>
      <div className="w-full p-10 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Link to="/" aria-label="Go to homepage">
            <img src={SeanoLogo} className="w-12" alt="SEANO Logo" width="48" height="48" loading="eager" />
          </Link>
          <div className="flex gap-2">
            <LanguageToggle className="text-gray-900 dark:text-white" />
            <button
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="p-3 rounded-full text-lg transition cursor-pointer text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {darkMode ? <FaMoon aria-hidden="true" /> : <FaSun aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Form */}
        <main className="flex justify-center h-full flex-col items-center">
          <div className="w-full xl:w-3/5 max-w-lg text-center mb-8">
            <h1 className="text-5xl text-gray-900 dark:text-white font-semibold mb-4">
              {t("auth.resetPassword.title")}
            </h1>
            <p className="font-medium text-gray-800 dark:text-gray-200 text-xl">
              {t("auth.resetPassword.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full xl:w-3/5 max-w-lg flex flex-col gap-4">
            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-black dark:text-white font-medium">
                {t("auth.resetPassword.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 pr-12 text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder={t("auth.resetPassword.passwordPlaceholder")}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 p-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-black dark:text-white font-medium">
                {t("auth.resetPassword.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 pr-12 text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 p-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <FaEyeSlash className="text-lg" /> : <FaEye className="text-lg" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-3.5 rounded-xl mt-4 cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingDots size="sm" color="white" text={t("auth.resetPassword.resetting")} />
                </span>
              ) : (
                t("auth.resetPassword.submit")
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
