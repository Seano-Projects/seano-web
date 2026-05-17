import { useState } from "react";
import { Link } from "react-router-dom";
import { FaMoon, FaSun } from "react-icons/fa";
import SeanoLogo from "../../assets/logo_seano.webp";
import { LoadingDots, toast, LanguageToggle } from "../../components/ui";
import useTranslation from "../../hooks/useTranslation";
import axios from "axios";
import { API_ENDPOINTS } from "../../config";

export default function ForgotPassword({ darkMode, toggleDarkMode }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error(t("auth.forgotPassword.errors.emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t("auth.forgotPassword.errors.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      await axios.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      setSent(true);
      toast.success(t("auth.forgotPassword.success.message"), {
        title: t("auth.forgotPassword.success.title"),
      });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        t("auth.forgotPassword.errors.failed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen grid grid-cols-1 bg-linear-to-br font-openSans ${
        darkMode ? "bg-black" : "bg-white"
      }`}
    >
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
              {t("auth.forgotPassword.title")}
            </h1>
            <p className="font-medium text-gray-800 dark:text-gray-200 text-xl">
              {t("auth.forgotPassword.subtitle")}
            </p>
          </div>

          {sent ? (
            <div className="w-full xl:w-3/5 max-w-lg text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <p className="text-green-800 dark:text-green-300 font-medium">
                  {t("auth.forgotPassword.sentMessage")}
                </p>
              </div>
              <Link
                to="/auth/login"
                className="inline-block text-blue-700 dark:text-blue-400 font-semibold underline hover:text-blue-800 dark:hover:text-blue-300"
              >
                {t("auth.forgotPassword.backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full xl:w-3/5 max-w-lg flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-black dark:text-white font-medium">
                  {t("auth.forgotPassword.email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-black dark:text-white bg-white dark:bg-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
                  required
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white py-3.5 rounded-xl mt-4 cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingDots size="sm" color="white" text={t("auth.forgotPassword.sending")} />
                  </span>
                ) : (
                  t("auth.forgotPassword.submit")
                )}
              </button>

              <p className="text-center text-gray-800 dark:text-gray-200 mt-4">
                <Link
                  to="/auth/login"
                  className="text-blue-700 dark:text-blue-400 font-semibold underline hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  {t("auth.forgotPassword.backToLogin")}
                </Link>
              </p>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
