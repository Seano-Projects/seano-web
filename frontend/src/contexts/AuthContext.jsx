import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config";
import axiosInstance from "../utils/axiosConfig";
import { toast } from "../components/ui";

// Create Context
export const AuthContext = createContext(null);

// Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Periodic token refresh to prevent expiration
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      // If no tokens, clear user state
      if (!token || !refreshToken) {
        if (user) {
          setUser(null);
          localStorage.removeItem("user");
        }
        return;
      }

      try {
        // Decode JWT to check expiration
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiration = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        const timeUntilExpiry = expiration - now;

        // If token expires in less than 6 hours, trigger refresh proactively
        if (timeUntilExpiry < sixHours) {
          try {
            // Make a simple API call to trigger axios interceptor refresh
            await axiosInstance.get(API_ENDPOINTS.AUTH.ME);
          } catch (error) {
            // Clear user state if refresh fails
            if (error.response?.status === 401) {
              setUser(null);
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("user");
            }
          }
        }
      } catch (e) {
        // If token is invalid, clear everything
        setUser(null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkAndRefreshToken, 2 * 60 * 1000);

    // Also check immediately
    checkAndRefreshToken();

    // Check when app becomes visible again (user switches tabs back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndRefreshToken();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Check when window regains focus
    const handleFocus = () => {
      checkAndRefreshToken();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []); // Remove user dependency - check based on tokens in localStorage

  // Function to check if user is authenticated
  const checkAuth = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      // Try to restore user from localStorage if available
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
      return;
    }

    try {
      // Use axiosInstance instead of fetch to leverage auto-refresh interceptor
      const response = await axiosInstance.get(API_ENDPOINTS.AUTH.ME);

      if (response.status === 200) {
        const userData = response.data;
        // Store user with permissions in localStorage for quick access
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      } else {
        // Token invalid, clear storage
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch (error) {
      // Only clear storage if it's a 401 error (unauthorized)
      // Other errors (network, etc.) shouldn't clear tokens
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        setUser(null);
      } else {
        // For network errors, try to restore user from localStorage
        const savedUser = localStorage.getItem("user");
        if (savedUser && !user) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      // Use axiosInstance for login (no token needed, so interceptor won't interfere)
      const response = await axiosInstance.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: email,
        password: password,
      });

      const data = response.data;

      // Save tokens to localStorage
      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      // Check if user data is in the response
      if (data.user) {
        // User data is already in login response
        // Store user in localStorage for quick access
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        // Dispatch custom event to trigger vehicle fetch
        window.dispatchEvent(new Event("userLoggedIn"));

        // Show success toast
        toast.success("Welcome back! Redirecting to dashboard...", {
          title: "Login Successful",
          duration: 2000,
        });

        // Delay navigation to show toast
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
        return { success: true };
      }

      // If no user in response, try to get it from /auth/me
      const userResponse = await axiosInstance.get(API_ENDPOINTS.AUTH.ME);

      if (userResponse.status === 200) {
        const userData = userResponse.data;
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);

        // Show success toast
        toast.success("Welcome back! Redirecting to dashboard...", {
          title: "Login Successful",
          duration: 2000,
        });

        // Redirect to dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 500);
        return { success: true };
      }

      // If still no user data, just redirect anyway
      toast.success("Login successful!", {
        title: "Welcome",
        duration: 2000,
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
      return { success: true };
    } catch (error) {
      let errorMessage = "Login failed. Please check your credentials.";

      // Handle error response
      if (error.response?.data) {
        const errorData = error.response.data;
        // Handle both Python (detail) and Go (error) response formats
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((e) => e.msg || e.message || JSON.stringify(e))
            .join(", ");
        } else if (errorData.detail) {
          errorMessage =
            typeof errorData.detail === "string"
              ? errorData.detail
              : JSON.stringify(errorData.detail);
        } else if (errorData.error) {
          // Go backend uses "error" field
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else {
        errorMessage =
          error.message || "Network error. Please check your connection.";
      }

      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Use axiosInstance to leverage auto-refresh if token is expired
      await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear storage and state
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      setUser(null);

      // Redirect to login
      navigate("/auth/login");
    }
  };

  // Context value
  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
