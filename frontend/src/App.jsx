import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
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
import useVehicleConnectionStatus from "./hooks/useVehicleConnectionStatus";
import {
  SelectedVehicleProvider,
  useSelectedVehicleContext,
} from "./contexts/SelectedVehicleContext";

// Setup React Query client dengan caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Layout Components (eager - always visible)
import { Header, Sidebar, Footbar } from "./components/Layout";
import { Content, Main } from "./components/ui";

// Lazy-loaded protected pages - code splitting per route
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Missions = lazy(() => import("./pages/Missions"));
const Data = lazy(() => import("./pages/Data"));
const Log = lazy(() => import("./pages/Log"));
const Settings = lazy(() => import("./pages/Settings"));
const Vehicle = lazy(() => import("./pages/Vehicle"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Profile = lazy(() => import("./pages/Profile"));
const Control = lazy(() => import("./pages/Control"));
const Camera = lazy(() => import("./pages/Camera"));
const Battery = lazy(() => import("./pages/Battery"));
const Sensor = lazy(() => import("./pages/Sensor"));
const SensorType = lazy(() => import("./pages/SensorType"));
const Notification = lazy(() => import("./pages/Notification"));
const User = lazy(() => import("./pages/User"));
const Role = lazy(() => import("./pages/Role"));
const Permission = lazy(() => import("./pages/Permission"));
const MissionsPlanner = lazy(() => import("./pages/MissionPlanner"));
const MissionDetails = lazy(() => import("./pages/MissionDetails"));
const MissionReport = lazy(() => import("./pages/MissionReport"));
const CTD = lazy(() => import("./pages/SensorMonitoring/CTD"));
const ADCP = lazy(() => import("./pages/SensorMonitoring/ADCP"));
const SBES = lazy(() => import("./pages/SensorMonitoring/SBES"));
const MBES = lazy(() => import("./pages/SensorMonitoring/MBES"));
const Weather = lazy(() => import("./pages/Weather"));
const GettingStarted = lazy(() => import("./pages/docs/GettingStarted"));
const MqttDocs = lazy(() => import("./pages/docs/MqttDocs"));
const ApiDocs = lazy(() => import("./pages/docs/ApiDocs"));
const DocsIndex = lazy(() => import("./pages/docs/DocsIndex"));
const MissionPlannerDocs = lazy(() => import("./pages/docs/MissionPlannerDocs"));
const ControlDocs = lazy(() => import("./pages/docs/ControlDocs"));

// Auth Pages - eager load (small, needed immediately)
import Login from "./pages/auth/Login";
import EmailRegistration from "./pages/auth/EmailRegistration";
import SetAccount from "./pages/auth/SetAccount";
import CheckEmailVerification from "./pages/auth/CheckEmailVerification";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Other - eager load (lightweight)
import Landing from "./pages/Landing";
import ErrorPage from "./components/Error/ErrorPage";

// Loading fallback for lazy-loaded pages
import { LoadingDots } from "./components/ui";
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingDots size="lg" />
  </div>
);

function App() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Use shared context for selected vehicle
  const {
    selectedVehicleId,
    setSelectedVehicleId: handleSetSelectedVehicleId,
  } = useSelectedVehicleContext();
  const { vehicles } = useVehicleData();
  const { isVehicleOnline } = useVehicleConnectionStatus();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      initializedRef.current = false;
      return;
    }

    if (!initializedRef.current && !selectedVehicleId) {
      // Default to first online vehicle if available, otherwise first vehicle
      const onlineVehicle = vehicles.find((v) => isVehicleOnline(v.code));
      const defaultId = onlineVehicle ? onlineVehicle.id : vehicles[0].id;
      handleSetSelectedVehicleId(defaultId);
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current && selectedVehicleId) {
      // Saved value exists - validate it still belongs to this user
      if (!vehicles.find((v) => v.id === selectedVehicleId)) {
        const onlineVehicle = vehicles.find((v) => isVehicleOnline(v.code));
        handleSetSelectedVehicleId(
          onlineVehicle ? onlineVehicle.id : vehicles[0].id,
        );
      }
      initializedRef.current = true;
    }
  }, [vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : null),
    [selectedVehicleId, vehicles]
  );

  useEffect(() => {
    const savedSidebar = localStorage.getItem("sidebarOpen");
    if (savedSidebar !== null) {
      setIsSidebarOpen(savedSidebar === "true");
    } else {
      setIsSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  // Close sidebar when thrust control enters fullscreen (consistent cross-platform)
  useEffect(() => {
    const handler = () => {
      setIsSidebarOpen(false);
      localStorage.setItem("sidebarOpen", "false");
    };
    window.addEventListener("thrust-fullscreen-open", handler);
    return () => window.removeEventListener("thrust-fullscreen-open", handler);
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
    "/auth/forgot-password",
    "/auth/reset-password",
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
          <Route
            path="/auth/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              </PublicRoute>
            }
          />
          <Route
            path="/auth/reset-password"
            element={
              <PublicRoute>
                <ResetPassword darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
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
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onHoverChange={setIsSidebarHovered}
        onClose={() => setIsSidebarOpen(false)}
      />
      <Footbar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
        <Main
          isSidebarOpen={isSidebarOpen}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={(vehicle) => {
            if (vehicle && vehicle.id) {
              handleSetSelectedVehicleId(vehicle.id);
            } else if (vehicle) {
              handleSetSelectedVehicleId(vehicle);
            }
          }}
          darkMode={darkMode}
        >
          <Content id="main-content">
            <Suspense fallback={<PageLoader />}>
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
                    <Settings darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
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
                  <ProtectedRoute adminOnly>
                    <MqttDocs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs/api"
                element={
                  <ProtectedRoute adminOnly>
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
            </Suspense>
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
          <SelectedVehicleProvider>
            <App />
          </SelectedVehicleProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default AppWithRouter;
