import { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import RegistrationRoute from "./components/RegistrationRoute";
import useVehicleData from "./hooks/useVehicleData";

// Setup React Query client dengan caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data dianggap fresh selama 5 menit
      gcTime: 10 * 60 * 1000, // Cache disimpan 10 menit (formerly cacheTime)
      refetchOnWindowFocus: false, // Tidak auto-refetch saat window focus
      retry: 1, // Retry 1x jika gagal
    },
  },
});

// Layout Components
import { Header, Sidebar, Footbar } from "./components/Layout";
import { Content, Main } from "./components/ui";

// Direct imports - load semua pages into main bundle
import Dashboard from "./pages/Dashboard";
import Tracking from "./pages/Tracking";
import Missions from "./pages/Missions";
import Data from "./pages/Data";
import Log from "./pages/Log";
import Settings from "./pages/Settings";
import Vehicle from "./pages/Vehicle";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import Control from "./pages/Control";
import Camera from "./pages/Camera";
import Battery from "./pages/Battery";
import Sensor from "./pages/Sensor";
import SensorType from "./pages/SensorType";
import Notification from "./pages/Notification";
import User from "./pages/User";
import Role from "./pages/Role";
import Permission from "./pages/Permission";
import MissionsPlanner from "./pages/MissionPlanner";
import MissionDetails from "./pages/MissionDetails";
import MissionReport from "./pages/MissionReport";
import CTD from "./pages/SensorMonitoring/CTD";
import ADCP from "./pages/SensorMonitoring/ADCP";
import SBES from "./pages/SensorMonitoring/SBES";
import MBES from "./pages/SensorMonitoring/MBES";
import Weather from "./pages/Weather";
import GettingStarted from "./pages/docs/GettingStarted";
import MqttDocs from "./pages/docs/MqttDocs";
import ApiDocs from "./pages/docs/ApiDocs";
import DocsIndex from "./pages/docs/DocsIndex";
import MissionPlannerDocs from "./pages/docs/MissionPlannerDocs";
import ControlDocs from "./pages/docs/ControlDocs";

// Auth Pages - EAGER LOAD untuk avoid chunking issues
import Login from "./pages/auth/Login";
import EmailRegistration from "./pages/auth/EmailRegistration";
import SetAccount from "./pages/auth/SetAccount";
import CheckEmailVerification from "./pages/auth/CheckEmailVerification";
import VerifyEmail from "./pages/auth/VerifyEmail";

// Other - eager load untuk pages yang ringan
import Landing from "./pages/Landing";
import ErrorPage from "./components/Error/ErrorPage";

function App() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const { vehicles } = useVehicleData();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      setSelectedVehicleId(null);
      initializedRef.current = false;
      return;
    }

    if (!initializedRef.current && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
      initializedRef.current = true;
      return;
    }

    if (
      selectedVehicleId &&
      !vehicles.find((v) => v.id === selectedVehicleId)
    ) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicle = selectedVehicleId
    ? vehicles.find((v) => v.id === selectedVehicleId)
    : null;

  useEffect(() => {
    const savedSidebar = localStorage.getItem("sidebarOpen");
    if (savedSidebar !== null) {
      setIsSidebarOpen(savedSidebar === "true");
    } else {
      setIsSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", newMode);
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return newMode;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", newState);
      return newState;
    });
  };

  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/email-registration",
    "/auth/set-account",
    "/auth/email-verification",
    "/verify-email",
  ];

  const protectedRoutes = [
    "/dashboard",
    "/tracking",
    "/missions",
    "/mission-planner",
    "/sensor-monitoring/ctd",
    "/sensor-monitoring/adcp",
    "/sensor-monitoring/sbes",
    "/sensor-monitoring/mbes",
    "/control",
    "/cam",
    "/battery",
    "/data",
    "/profile",
    "/sensor",
    "/sensor-type",
    "/logs",
    "/settings",
    "/vehicle",
    "/alerts",
    "/notification",
    "/user",
    "/role",
    "/permission",
    "/docs",
    "/weather",
  ];

  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isProtectedRoute = protectedRoutes.some((route) =>
    location.pathname.startsWith(route),
  );

  if (location.pathname === "/404") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <ErrorPage code={404} />
      </div>
    );
  }

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/auth/login"
            element={
              <PublicRoute>
                <Login darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/email-registration"
            element={
              <PublicRoute>
                <EmailRegistration
                  darkMode={darkMode}
                  toggleDarkMode={toggleDarkMode}
                />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/set-account"
            element={
              <PublicRoute>
                <RegistrationRoute requiredStep="set-account">
                  <SetAccount
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                  />
                </RegistrationRoute>
              </PublicRoute>
            }
          />
          <Route
            path="/auth/email-verification"
            element={
              <PublicRoute>
                <RegistrationRoute requiredStep="email-verification">
                  <CheckEmailVerification
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                  />
                </RegistrationRoute>
              </PublicRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <PublicRoute>
                <RegistrationRoute requiredStep="verify-email">
                  <VerifyEmail
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                  />
                </RegistrationRoute>
              </PublicRoute>
            }
          />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    );
  }

  if (!isProtectedRoute) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <ErrorPage
          code={404}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </div>
    );
  }

  return (
    <div className="font-openSans flex bg-white dark:bg-black">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <Sidebar isSidebarOpen={isSidebarOpen} onHoverChange={setIsSidebarHovered} />
      <Footbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
        <Main
          isSidebarOpen={isSidebarOpen}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={(vehicle) => {
            if (vehicle && vehicle.id) {
              setSelectedVehicleId(vehicle.id);
            } else if (vehicle) {
              setSelectedVehicleId(vehicle);
            }
          }}
          darkMode={darkMode}
        >
          <Content id="main-content">
            {/* All pages loaded directly - no lazy loading */}
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute>
                    <Tracking
                      darkMode={darkMode}
                      selectedVehicle={selectedVehicle}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/missions"
                element={
                  <ProtectedRoute>
                    <Missions
                      darkMode={darkMode}
                      isSidebarOpen={isSidebarOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/missions/:missionId"
                element={
                  <ProtectedRoute>
                    <MissionDetails
                      darkMode={darkMode}
                      isSidebarOpen={isSidebarOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/missions/:missionId/report"
                element={
                  <ProtectedRoute>
                    <MissionReport
                      darkMode={darkMode}
                      isSidebarOpen={isSidebarOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mission-planner"
                element={
                  <ProtectedRoute>
                    <MissionsPlanner
                      darkMode={darkMode}
                      isSidebarOpen={isSidebarOpen || isSidebarHovered}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor-monitoring/ctd"
                element={
                  <ProtectedRoute>
                    <CTD darkMode={darkMode} isSidebarOpen={isSidebarOpen} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor-monitoring/adcp"
                element={
                  <ProtectedRoute>
                    <ADCP darkMode={darkMode} isSidebarOpen={isSidebarOpen} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor-monitoring/sbes"
                element={
                  <ProtectedRoute>
                    <SBES darkMode={darkMode} isSidebarOpen={isSidebarOpen} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor-monitoring/mbes"
                element={
                  <ProtectedRoute>
                    <MBES darkMode={darkMode} isSidebarOpen={isSidebarOpen} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/control"
                element={
                  <ProtectedRoute>
                    <Control
                      darkMode={darkMode}
                      isSidebarOpen={isSidebarOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cam"
                element={
                  <ProtectedRoute>
                    <Camera darkMode={darkMode} isSidebarOpen={isSidebarOpen} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/battery"
                element={
                  <ProtectedRoute>
                    <Battery
                      darkMode={darkMode}
                      isSidebarOpen={isSidebarOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/weather"
                element={
                  <ProtectedRoute>
                    <Weather darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/data"
                element={
                  <ProtectedRoute>
                    <Data darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor"
                element={
                  <ProtectedRoute>
                    <Sensor darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor-type"
                element={
                  <ProtectedRoute>
                    <SensorType darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <ProtectedRoute>
                    <Log darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicle"
                element={
                  <ProtectedRoute>
                    <Vehicle darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <Alerts darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notification"
                element={
                  <ProtectedRoute>
                    <Notification darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user"
                element={
                  <ProtectedRoute>
                    <User darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/role"
                element={
                  <ProtectedRoute>
                    <Role darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/permission"
                element={
                  <ProtectedRoute>
                    <Permission darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs"
                element={
                  <ProtectedRoute>
                    <DocsIndex />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs/getting-started"
                element={
                  <ProtectedRoute>
                    <GettingStarted />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs/mqtt"
                element={
                  <ProtectedRoute>
                    <MqttDocs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs/api"
                element={
                  <ProtectedRoute>
                    <ApiDocs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs/mission-planner"
                element={
                  <ProtectedRoute>
                    <MissionPlannerDocs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs/control"
                element={
                  <ProtectedRoute>
                    <ControlDocs />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Content>
        </Main>
      </div>
    </div>
  );
}

const AppWithRouter = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <App />
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default AppWithRouter;
