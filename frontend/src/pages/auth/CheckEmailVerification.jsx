import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaEnvelope, FaMoon, FaSun } from "react-icons/fa6";
import SeanoLogo from "../../assets/logo_seano.webp";
import useAuth from "../../hooks/useAuth";
import { LoadingDots, toast } from "../../components/ui";

const RESEND_COOLDOWN_SECONDS = 30;

export default function CheckEmailVerification({ darkMode, toggleDarkMode }) {
  const location = useLocation();
  const { resendVerification, loading } = useAuth();
  const [cooldown, setCooldown] = useState(0);

  const email =
    location.state?.email || localStorage.getItem("registrationEmail") || "";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (loading || cooldown > 0) return;

    if (!email) {
      toast.error(
        "We couldn't find your email address. Please register again.",
      );
      return;
    }

    const result = await resendVerification(email);

    if (result.success) {
      toast.success(result.message, { title: "Email Sent", duration: 3000 });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      toast.error(result.error, {
        title: "Failed to Resend",
        duration: 5000,
      });
    }
  };

  return (
    <div
      className={`min-h-screen grid grid-cols-1 bg-gradient-to-br font-openSans ${
        darkMode ? "bg-black" : "bg-white"
      }`}
    >
      <div className="w-full p-10 flex flex-col">
        {/* Header Auth */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">
              <Link
                to="/"
                aria-label="Go to homepage"
                className="text-gray-900 font-semibold dark:text-white"
              >
                <img
                  src={SeanoLogo}
                  className="w-12"
                  alt="SEANO Logo"
                  width="48"
                  height="48"
                  loading="eager"
                />
              </Link>
            </h1>
          </div>
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
        {/* End Header Auth */}

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-full mb-2">
              <FaEnvelope
                className="text-blue-700 dark:text-blue-300"
                size={48}
                aria-hidden="true"
              />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
              Check Your Email!
            </h1>
            <p className="text-lg text-gray-800 dark:text-gray-200 max-w-2xl">
              We have sent a verification link to your email address.
              <br />
              Please check your inbox and follow the instructions to verify your
              account.
              <br />
              If you don't see the email, please check your spam or junk folder.
            </p>
            <button
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="cursor-pointer mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingDots size="sm" color="white" text="Sending" />
                </span>
              ) : cooldown > 0 ? (
                `Resend Email (${cooldown}s)`
              ) : (
                "Resend Email"
              )}
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Didn't receive the email?{" "}
              <span
                onClick={handleResend}
                className={`font-semibold underline text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ${
                  loading || cooldown > 0
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
              </span>
            </p>
          </div>
        </main>
        {/* End Main Content */}
      </div>
    </div>
  );
}
