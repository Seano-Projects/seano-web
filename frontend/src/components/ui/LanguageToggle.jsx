import { useLanguage } from "../../contexts/LanguageContext";

export default function LanguageToggle({ className = "" }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      aria-label={`Switch to ${language === "en" ? "Indonesian" : "English"}`}
      className={`p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      title={language === "en" ? "Switch to Indonesian" : "Switch to English"}
    >
      <span
        className={`fi fi-${language === "en" ? "id" : "gb"} text-2xl`}
      ></span>
    </button>
  );
}
