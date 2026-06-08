import { createContext, useContext } from "react";
import { useLogData as useLogDataHook } from "../hooks/useLogData";

const LogDataContext = createContext(null);

/**
 * LogDataProvider - Singleton provider for useLogData
 * 
 * Ensures only ONE WebSocket connection and ONE set of API calls
 * are made for the entire app, instead of per-component.
 */
export const LogDataProvider = ({ children }) => {
  const logData = useLogDataHook();
  return (
    <LogDataContext.Provider value={logData}>
      {children}
    </LogDataContext.Provider>
  );
};

/**
 * useLogDataContext - Consumer hook that reads from the singleton provider.
 * Drop-in replacement for direct useLogData() calls.
 */
export const useLogDataContext = () => {
  const context = useContext(LogDataContext);
  if (!context) {
    throw new Error("useLogDataContext must be used within LogDataProvider");
  }
  return context;
};

export default LogDataContext;
