import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";
import App from "./App.jsx";
import { ToastProvider } from "./components/ui";
import { LanguageProvider } from "./contexts/LanguageContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LanguageProvider>
  </StrictMode>,
);
