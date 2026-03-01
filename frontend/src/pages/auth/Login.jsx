import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaMoon, FaSun, FaEye, FaEyeSlash } from "react-icons/fa";
import SeanoLogo from "../../assets/logo_seano.webp";
import { useAuthContext } from "../../hooks/useAuthContext";
import { LoadingDots, toast, LanguageToggle } from "../../components/ui";
import useTranslation from "../../hooks/useTranslation";

export default function Login({ darkMode, toggleDarkMode }) {
  const { login } = useAuthContext();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: false, password: false });

  // Check for registration success flag
  useEffect(() => {
    const showRegistrationSuccess = localStorage.getItem(
      "showRegistrationSuccess",
    );
    if (showRegistrationSuccess === "true") {
      toast.success(t("auth.login.registrationSuccess.message"), {
        title: t("auth.login.registrationSuccess.title"),
        duration: 4000,
      });
      localStorage.removeItem("showRegistrationSuccess");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setErrors({ email: false, password: false });

    // Validation
    if (!email || !password) {
      setErrors({
        email: !email,
        password: !password,
      });
      toast.error(t("auth.login.errors.emailRequired"));
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ ...errors, email: true });
      toast.error(t("auth.login.errors.invalidEmail"));
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      // Show error toast
      const errorMsg =
        typeof result.error === "string"
          ? result.error
          : t("auth.login.errors.invalidCredentials");

      toast.error(errorMsg, {
        title: t("auth.login.errors.loginFailed"),
        duration: 5000,
      });

      // Only highlight password field if email format is valid
      // This provides better UX without revealing which field is wrong for security
      setErrors({ email: false, password: true });
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
              {t("auth.login.title")}
            </h1>
            <p
              className="font-medium text-gray-800 dark:text-gray-200 text-xl"
              dangerouslySetInnerHTML={{
                __html: t("auth.login.subtitle").replace(
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
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-black dark:text-white font-medium"
              >
                {t("auth.login.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({ ...errors, email: false });
                }}
                className={`w-full border rounded-xl py-3 px-4 text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                }`}
                placeholder={t("auth.login.emailPlaceholder")}
                required
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {t("auth.login.errors.invalidEmail")}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-black dark:text-white font-medium"
              >
                {t("auth.login.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
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
                  placeholder={t("auth.login.passwordPlaceholder")}
                  required
                  autoComplete="current-password"
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
                  {t("auth.login.errors.emailRequired")}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-3.5 rounded-xl mt-6 cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingDots
                    size="sm"
                    color="white"
                    text={t("auth.login.signingIn")}
                  />
                </span>
              ) : (
                t("auth.login.signIn")
              )}
            </button>

            {/* Register Link */}
            <p className="text-center text-gray-800 dark:text-gray-200 mt-4">
              {t("auth.login.noAccount")}{" "}
              <Link
                to="/auth/email-registration"
                className="text-blue-700 dark:text-blue-400 font-semibold underline hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
              >
                {t("auth.login.register")}
              </Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
