import React, { createContext, useContext, useState } from "react";

const STORAGE_KEY = "selectedVehicleId";

/**
 * Single source of truth for the selected vehicle across all pages.
 * App.jsx provides this context. useVehicleData reads from it.
 */
export const SelectedVehicleContext = createContext({
  selectedVehicleId: null,
  setSelectedVehicleId: () => {},
});

export const SelectedVehicleProvider = ({ children }) => {
  const [selectedVehicleId, setSelectedVehicleIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const setSelectedVehicleId = (id) => {
    const numId = id != null && id !== "" ? parseInt(id, 10) : null;
    setSelectedVehicleIdState(numId);
    try {
      if (numId != null) {
        localStorage.setItem(STORAGE_KEY, String(numId));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  };

  return (
    <SelectedVehicleContext.Provider
      value={{ selectedVehicleId, setSelectedVehicleId }}
    >
      {children}
    </SelectedVehicleContext.Provider>
  );
};

export const useSelectedVehicleContext = () =>
  useContext(SelectedVehicleContext);
