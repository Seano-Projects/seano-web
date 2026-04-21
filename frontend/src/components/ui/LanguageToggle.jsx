import { useLanguage } from "../../contexts/LanguageContext";

export default function LanguageToggle({ className = "" }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      aria-label={`Switch to ${language === "en" ? "Indonesian" : "English"}`}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800 overflow-hidden ${className}`}
      title={language === "en" ? "Switch to Indonesian" : "Switch to English"}
    >
      <span
        className={`fi fi-${language === "en" ? "id" : "gb"} text-xl`}
      ></span>
    </button>
  );
}
