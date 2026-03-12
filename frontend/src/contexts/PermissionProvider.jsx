import { useState, useEffect } from "react";
import { useAuthContext } from "../hooks/useAuthContext";
import { API_ENDPOINTS } from "../config";
import { PermissionContext } from "./PermissionContext";

// Provider Component
export function PermissionProvider({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPermissions();
    } else {
      setPermissions([]);
      localStorage.removeItem("permissions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Re-fetch after login event
  useEffect(() => {
    const handleUserLogin = () => {
      if (isAuthenticated && user) fetchPermissions();
    };
    window.addEventListener("userLoggedIn", handleUserLogin);
    return () => window.removeEventListener("userLoggedIn", handleUserLogin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  /**
   * Single source of truth: GET /users/:id
   * The backend returns the user with role.permissions preloaded.
   * localStorage is used only as a performance cache between reloads.
   */
  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");

      if (!user?.id) {
        setPermissions([]);
        return;
      }

      const response = await fetch(API_ENDPOINTS.USERS.BY_ID(user.id), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        const permissionNames =
          userData?.role?.permissions?.map((p) => p.name ?? p) ?? [];
        setPermissions(permissionNames);
        localStorage.setItem("permissions", JSON.stringify(permissionNames));
        return;
      }

      // If API failed, use localStorage cache rather than invented defaults
      const cached = localStorage.getItem("permissions");
      if (cached) {
        setPermissions(JSON.parse(cached));
      } else {
        setPermissions([]);
      }
    } catch (err) {
      setError(err.message);
      const cached = localStorage.getItem("permissions");
      setPermissions(cached ? JSON.parse(cached) : []);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    if (!isAuthenticated || !user) return false;
    return (user.role?.toLowerCase?.() ?? user.role) === "admin";
  };

  // Admin bypasses all permission checks (has everything)
  const hasPermission = (permissionName) => {
    if (!isAuthenticated) return false;
    if (isAdmin()) return true;
    return permissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionNames) => {
    if (!isAuthenticated) return false;
    if (isAdmin()) return true;
    return permissionNames.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (permissionNames) => {
    if (!isAuthenticated) return false;
    if (isAdmin()) return true;
    return permissionNames.every((p) => permissions.includes(p));
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        error,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}
