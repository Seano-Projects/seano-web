import SeanoLogo from "../../assets/logo_seano.webp";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaMoon, FaSun, FaEye, FaEyeSlash } from "react-icons/fa";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { LoadingDots, toast, LanguageToggle } from "../../components/ui";
import useTranslation from "../../hooks/useTranslation";

export default function SetAccount({ darkMode, toggleDarkMode }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { setCredentials, loading } = useAuth();
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({
    username: false,
    password: false,
    confirm: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setErrors({ username: false, password: false, confirm: false });

    // Validation
    if (!username || !password || !confirm) {
      setErrors({
        username: !username,
        password: !password,
        confirm: !confirm,
      });
      toast.error(t("auth.setAccount.errors.fillAllFields"));
      return;
    }

    if (username.length < 3) {
      setErrors({ ...errors, username: true });
      toast.error(t("auth.setAccount.errors.usernameMinLength"));
      return;
    }

    if (password.length < 6) {
      setErrors({ ...errors, password: true });
      toast.error(t("auth.setAccount.errors.passwordMinLength"));
      return;
    }

    if (password !== confirm) {
      setErrors({ ...errors, password: true, confirm: true });
      toast.error(t("auth.setAccount.errors.passwordMismatch"));
      return;
    }

    const result = await setCredentials(token, username, password);

    if (result.success) {
      toast.success(t("auth.setAccount.success.message"), {
        title: t("auth.setAccount.success.title"),
        duration: 2500,
      });
      // Clear registration data from localStorage
      localStorage.removeItem("registrationEmail");
      // Set flag to show success message on login page
      localStorage.setItem("showRegistrationSuccess", "true");
      setTimeout(() => navigate("/auth/login"), 2000);
    } else {
      toast.error(result.error || t("auth.setAccount.errors.failedToCreate"), {
        title: t("auth.setAccount.errors.accountSetupFailed"),
        duration: 5000,
      });
    }
  };

  return (
    <div
      className={`min-h-screen grid grid-cols-1 
        bg-gradient-to-br font-openSans
        ${darkMode ? "bg-black" : "bg-white"}`}
    >
      <div className="w-full p-10 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Link to="/" aria-label="Go to homepage">
            <img
              src={SeanoLogo}
              className="w-12"
              alt="SEANO Logo"
              width="48"
              height="48"
              loading="eager"
            />
          </Link>

          <div className="flex gap-2">
            <LanguageToggle className="text-gray-900 dark:text-white" />
            <button
              onClick={toggleDarkMode}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              className="p-3 rounded-full text-lg transition cursor-pointer text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {darkMode ? (
                <FaMoon aria-hidden="true" />
              ) : (
                <FaSun aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Form */}
        <main className="flex justify-center h-full flex-col items-center">
          <div className="w-full xl:w-3/5 max-w-lg text-center mb-8">
            <h1 className="text-5xl text-gray-900 dark:text-white font-semibold mb-4">
              {t("auth.setAccount.title")}
            </h1>
            <p
              className="font-medium text-gray-800 dark:text-gray-200 text-xl"
              dangerouslySetInnerHTML={{
                __html: t("auth.setAccount.subtitle").replace(
                  "<span>",
                  '<span class="text-blue-700 dark:text-blue-400 font-semibold">',
                ),
              }}
            />
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full xl:w-3/5 max-w-lg flex flex-col gap-4"
          >
            {/* Username */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="username"
                className="text-black dark:text-white font-medium"
              >
                {t("auth.setAccount.username")}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors({ ...errors, username: false });
                }}
                className={`w-full border rounded-xl py-3 px-4 text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 transition-all ${
                  errors.username
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                }`}
                placeholder={t("auth.setAccount.usernamePlaceholder")}
                minLength={3}
                required
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {t("auth.setAccount.errors.usernameRequired")}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-black dark:text-white font-medium"
              >
                {t("auth.setAccount.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: false });
                  }}
                  className={`w-full border rounded-xl py-3 px-4 pr-12 text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  }`}
                  placeholder={t("auth.setAccount.passwordPlaceholder")}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <FaEyeSlash aria-hidden="true" className="text-lg" />
                  ) : (
                    <FaEye aria-hidden="true" className="text-lg" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {t("auth.setAccount.errors.passwordRequired")}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="confirm-password"
                className="text-black dark:text-white font-medium"
              >
                {t("auth.setAccount.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setErrors({ ...errors, confirm: false });
                  }}
                  className={`w-full border rounded-xl py-3 px-4 pr-12 text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.confirm
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  }`}
                  placeholder={t("auth.setAccount.confirmPasswordPlaceholder")}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? (
                    <FaEyeSlash aria-hidden="true" className="text-lg" />
                  ) : (
                    <FaEye aria-hidden="true" className="text-lg" />
                  )}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-red-500 text-sm mt-1">
                  {t("auth.setAccount.errors.confirmPasswordRequired")}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              aria-label="Create account"
              className="bg-blue-600 text-white py-3.5 rounded-xl mt-6 cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingDots
                    size="sm"
                    color="white"
                    text={t("auth.setAccount.creatingAccount")}
                  />
                </span>
              ) : (
                t("auth.setAccount.createAccount")
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
