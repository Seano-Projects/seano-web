import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";
import App from "./App.jsx";
import { ToastProvider } from "./components/ui";
import { LanguageProvider } from "./contexts/LanguageContext";
import { VehicleConnectionProvider } from "./contexts/VehicleConnectionContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <VehicleConnectionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </VehicleConnectionProvider>
    </LanguageProvider>
  </StrictMode>,
);
