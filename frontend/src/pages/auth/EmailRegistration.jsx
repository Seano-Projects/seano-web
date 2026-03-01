import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaMoon, FaSun } from "react-icons/fa";
import SeanoLogo from "../../assets/logo_seano.webp";
import useAuth from "../../hooks/useAuth";
import { LoadingDots, toast, LanguageToggle } from "../../components/ui";
import useTranslation from "../../hooks/useTranslation";

export default function EmailRegistration({ darkMode, toggleDarkMode }) {
  const [email, setEmail] = useState("");
  const { registerEmail, loading } = useAuth();
  const [errors, setErrors] = useState({ email: false });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: false });

    // Email validation
    if (!email || email.trim() === "") {
      setErrors({ email: true });
      toast.error(t("auth.register.errors.emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ email: true });
      toast.error(t("auth.register.errors.invalidEmail"));
      return;
    }

    const result = await registerEmail(email);

    if (result.success) {
      toast.success(result.message || t("auth.register.success.message"), {
        title: t("auth.register.success.title"),
        duration: 3000,
      });
      // Save email to localStorage for registration flow protection
      localStorage.setItem("registrationEmail", email);
      setTimeout(() => {
        navigate("/auth/email-verification", { state: { email } });
      }, 1500);
    } else {
      toast.error(result.error || t("auth.register.errors.failedToRegister"), {
        title: t("auth.register.errors.registrationFailed"),
        duration: 5000,
      });
      setErrors({ email: true });
    }
  };

  return (
    <div
      className={`min-h-screen grid grid-cols-1 bg-gradient-to-br font-openSans ${
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
              className="p-3 rounded-full text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <main className="flex justify-center items-center flex-col h-full">
          <div className="w-full xl:w-3/5 max-w-lg text-center mb-8">
            <h1 className="text-5xl text-gray-900 dark:text-white font-semibold">
              {t("auth.register.title")}
            </h1>
            <h2
              className="text-xl font-medium text-gray-800 dark:text-gray-200 mt-2"
              dangerouslySetInnerHTML={{
                __html: t("auth.register.subtitle").replace(
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
            <div className="flex flex-col gap-2">
              <label
                htmlFor="registration-email"
                className="text-black dark:text-white font-medium"
              >
                {t("auth.register.email")}
              </label>
              <input
                id="registration-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({ email: false });
                }}
                required
                autoComplete="email"
                placeholder={t("auth.register.emailPlaceholder")}
                className={`w-full rounded-xl py-3 px-4 border text-black dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {t("auth.register.errors.invalidEmail")}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-label="Register with email"
              className="bg-blue-600 text-white py-3.5 rounded-xl mt-6 hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingDots
                    size="sm"
                    color="white"
                    text={t("auth.register.sending")}
                  />
                </span>
              ) : (
                t("auth.register.continue")
              )}
            </button>

            <p className="text-center text-gray-800 dark:text-gray-200 mt-4">
              {t("auth.register.hasAccount")}{" "}
              <Link
                to="/auth/login"
                className="text-blue-700 dark:text-blue-400 font-semibold underline hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
              >
                {t("auth.register.login")}
              </Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
