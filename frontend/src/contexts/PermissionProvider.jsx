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

  // Fetch permissions when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPermissions();
    } else {
      setPermissions([]);
      localStorage.removeItem("permissions");
    }
  }, [isAuthenticated, user]);

  // Also listen for userLoggedIn event to refetch permissions
  useEffect(() => {
    const handleUserLogin = () => {
      if (isAuthenticated && user) {
        fetchPermissions();
      }
    };

    window.addEventListener("userLoggedIn", handleUserLogin);
    return () => {
      window.removeEventListener("userLoggedIn", handleUserLogin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Default permissions mapping based on role name
  const getDefaultPermissionsByRole = (roleName) => {
    const role = roleName?.toLowerCase();

    // Default permissions for "user" role (regular users)
    // These permissions match the menu items that should be visible to regular users
    if (role === "user") {
      return [
        "tracking.read",
        "missions.read",
        "control.read",
        "battery.read",
        "sensor-monitoring.read",
        "logs.read",
        "alerts.read",
        "notifications.read",
        "vehicles.read",
        "sensor_logs.read",
        "sensors.read",
      ];
    }

    // Admin has all permissions (will be fetched from backend)
    // Don't use defaults for admin, let it fetch from backend
    if (role === "admin") {
      return []; // Let admin fetch from backend
    }

    // Default for other roles (moderator, etc.)
    // Use same as user for now, can be customized later
    return [
      "tracking.read",
      "missions.read",
      "control.read",
      "logs.read",
      "alerts.read",
      "notifications.read",
      "vehicles.read",
      "sensor_logs.read",
      "sensors.read",
    ];
  };

  // Function to fetch user permissions from backend
  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");

      // Strategy 1: Try to get user's own data with role and permissions
      if (user?.id) {
        try {
          const userResponse = await fetch(API_ENDPOINTS.USERS.BY_ID(user.id), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Check if user data includes role with permissions
            if (
              userData.role &&
              typeof userData.role === "object" &&
              userData.role.permissions
            ) {
              const permissionNames = userData.role.permissions.map(
                (p) => p.name || p,
              );
              setPermissions(permissionNames);
              localStorage.setItem(
                "permissions",
                JSON.stringify(permissionNames),
              );
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // Could not fetch from /users/:id, trying other methods
        }
      }

      // Strategy 2: If user has role, try to get all roles and find the one matching user's role
      // (Only works if user has roles.view permission, i.e., admin)
      if (user?.role) {
        try {
          const rolesResponse = await fetch(API_ENDPOINTS.ROLES.LIST, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            // Handle different response formats
            const roles = Array.isArray(rolesData)
              ? rolesData
              : rolesData.data || [];

            // Find role matching user's role name
            const userRole = roles.find(
              (r) => r.name?.toLowerCase() === user.role?.toLowerCase(),
            );

            if (userRole && userRole.permissions) {
              // Extract permission names from role
              const permissionNames = userRole.permissions.map(
                (p) => p.name || p,
              );
              setPermissions(permissionNames);
              // Cache in localStorage
              localStorage.setItem(
                "permissions",
                JSON.stringify(permissionNames),
              );
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          // Could not fetch from /roles/, user may not have roles.view permission
        }
      }

      // Strategy 3: Try to get permissions from /permissions endpoint (requires permissions.read)
      try {
        const response = await fetch(API_ENDPOINTS.PERMISSIONS.LIST, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          const permissionsList = Array.isArray(data) ? data : data.data || [];
          // Extract permission names and store them
          const permissionNames = permissionsList.map((p) => p.name || p);
          setPermissions(permissionNames);
          // Cache in localStorage
          localStorage.setItem("permissions", JSON.stringify(permissionNames));
          setLoading(false);
          return;
        }
      } catch (err) {}

      // Strategy 4: Use default permissions based on role name
      if (user?.role) {
        const defaultPermissions = getDefaultPermissionsByRole(user.role);
        if (defaultPermissions.length > 0) {
          setPermissions(defaultPermissions);
          localStorage.setItem(
            "permissions",
            JSON.stringify(defaultPermissions),
          );
          setLoading(false);
          return;
        }
      }

      // Strategy 5: Try to get permissions from localStorage cache
      const cached = localStorage.getItem("permissions");
      if (cached) {
        setPermissions(JSON.parse(cached));
      } else {
        // Set empty array to prevent errors
        setPermissions([]);
      }
    } catch (err) {
      setError(err.message);
      // Fallback to cached permissions
      const cached = localStorage.getItem("permissions");
      if (cached) {
        setPermissions(JSON.parse(cached));
      } else {
        // Use default permissions if available
        if (user?.role) {
          const defaultPermissions = getDefaultPermissionsByRole(user.role);
          setPermissions(defaultPermissions);
        } else {
          setPermissions([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function: Check if user has a specific permission
  const hasPermission = (permissionName) => {
    if (!isAuthenticated) return false;
    return permissions.includes(permissionName);
  };

  // Helper function: Check if user has ANY of the given permissions
  const hasAnyPermission = (permissionNames) => {
    if (!isAuthenticated) return false;
    return permissionNames.some((p) => permissions.includes(p));
  };

  // Helper function: Check if user has ALL of the given permissions
  const hasAllPermissions = (permissionNames) => {
    if (!isAuthenticated) return false;
    return permissionNames.every((p) => permissions.includes(p));
  };

  // Helper function: Check if user is Admin
  const isAdmin = () => {
    if (!isAuthenticated || !user) return false;
    // Check by role name (more reliable)
    const roleName = user.role?.toLowerCase?.() || user.role;
    return roleName === "admin";
  };

  // Helper function: Check if user has a specific permission (updated to bypass for admin)
  const hasPermissionWithAdmin = (permissionName) => {
    if (!isAuthenticated) return false;
    // Admin has all permissions
    if (isAdmin()) return true;
    return permissions.includes(permissionName);
  };

  // Helper function: Check if user has ANY of the given permissions (updated to bypass for admin)
  const hasAnyPermissionWithAdmin = (permissionNames) => {
    if (!isAuthenticated) return false;
    // Admin has all permissions
    if (isAdmin()) return true;
    return permissionNames.some((p) => permissions.includes(p));
  };

  // Helper function: Check if user has ALL of the given permissions (updated to bypass for admin)
  const hasAllPermissionsWithAdmin = (permissionNames) => {
    if (!isAuthenticated) return false;
    // Admin has all permissions
    if (isAdmin()) return true;
    return permissionNames.every((p) => permissions.includes(p));
  };

  // Context value
  const value = {
    permissions,
    loading,
    error,
    hasPermission: hasPermissionWithAdmin,
    hasAnyPermission: hasAnyPermissionWithAdmin,
    hasAllPermissions: hasAllPermissionsWithAdmin,
    isAdmin,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}
