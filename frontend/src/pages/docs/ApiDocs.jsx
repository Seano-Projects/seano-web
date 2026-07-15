import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCode,
  FaChevronLeft,
  FaArrowLeft,
  FaArrowRight,
  FaLock,
  FaUnlock,
} from "react-icons/fa";
import useTitle from "../../hooks/useTitle";

const GROUPS = [
  {
    name: "Auth",
    color: "bg-blue-600 text-white",
    endpoints: [
      { method: "POST", path: "/auth/register-email", auth: false, desc: "Register a new email to receive a verification link." },
      { method: "POST", path: "/auth/verify-email", auth: false, desc: "Verify email with token from the link." },
      { method: "POST", path: "/auth/set-credentials", auth: false, desc: "Set password and account details after email verification." },
      { method: "POST", path: "/auth/resend-verification", auth: false, desc: "Resend the verification email." },
      { method: "POST", path: "/auth/login", auth: false, desc: "Login and receive access token + refresh token." },
      { method: "POST", path: "/auth/refresh", auth: false, desc: "Refresh the access token using a refresh token." },
      { method: "GET", path: "/auth/me", auth: true, desc: "Get the profile of the currently logged-in user." },
      { method: "POST", path: "/auth/logout", auth: true, desc: "Logout and invalidate the token." },
    ],
  },
  {
    name: "Users",
    color: "bg-teal-600 text-white",
    endpoints: [
      { method: "POST", path: "/users", auth: true, perm: "users.create", desc: "Create a new user." },
      { method: "GET", path: "/users", auth: true, perm: "users.read", desc: "List all users." },
      { method: "GET", path: "/users/:user_id", auth: true, desc: "Get user details by ID." },
      { method: "PUT", path: "/users/:user_id", auth: true, desc: "Update user data (ownership check)." },
      { method: "DELETE", path: "/users/:user_id", auth: true, perm: "users.delete", desc: "Delete a user." },
    ],
  },
  {
    name: "Roles & Permissions",
    color: "bg-gray-500 text-white",
    endpoints: [
      { method: "POST", path: "/roles", auth: true, perm: "roles.manage", desc: "Create a new role." },
      { method: "GET", path: "/roles", auth: true, perm: "roles.read", desc: "List all roles." },
      { method: "PUT", path: "/roles/:id", auth: true, perm: "roles.manage", desc: "Update a role." },
      { method: "DELETE", path: "/roles/:id", auth: true, perm: "roles.manage", desc: "Delete a role." },
      { method: "POST", path: "/permissions", auth: true, perm: "permissions.manage", desc: "Create a new permission." },
      { method: "GET", path: "/permissions", auth: true, perm: "permissions.read", desc: "List all permissions." },
      { method: "POST", path: "/permissions/assign-to-role", auth: true, perm: "permissions.manage", desc: "Assign a permission to a role." },
      { method: "DELETE", path: "/permissions/remove-from-role/:role_id/:permission_id", auth: true, perm: "permissions.manage", desc: "Remove a permission from a role." },
    ],
  },
  {
    name: "Vehicles",
    color: "bg-green-600 text-white",
    endpoints: [
      {
        method: "POST",
        path: "/vehicles",
        auth: true,
        desc: "Register a new vehicle.",
      },
      {
        method: "GET",
        path: "/vehicles",
        auth: true,
        desc: "List all vehicles owned by the user.",
      },
      {
        method: "GET",
        path: "/vehicles/connection-statuses",
        auth: true,
        desc: "MQTT connection status (LWT) for all vehicles.",
      },
      {
        method: "GET",
        path: "/vehicles/:vehicle_id",
        auth: true,
        desc: "Get vehicle details by ID.",
      },
      {
        method: "PUT",
        path: "/vehicles/:vehicle_id",
        auth: true,
        desc: "Update vehicle data.",
      },
      {
        method: "DELETE",
        path: "/vehicles/:vehicle_id",
        auth: true,
        desc: "Delete a vehicle.",
      },
      {
        method: "GET",
        path: "/vehicles/:vehicle_id/battery",
        auth: true,
        desc: "Latest battery status for the vehicle.",
      },
      {
        method: "GET",
        path: "/vehicles/:vehicle_id/battery-logs",
        auth: true,
        desc: "Battery log history for the vehicle.",
      },
      {
        method: "GET",
        path: "/vehicle-batteries/latest",
        auth: true,
        desc: "Latest battery status for all vehicles.",
      },
      {
        method: "POST",
        path: "/vehicle-batteries",
        auth: true,
        desc: "Submit battery data (bearer token; ingestion normally happens via MQTT listeners, not this endpoint).",
      },
      {
        method: "POST",
        path: "/vehicle-status",
        auth: true,
        desc: "Submit vehicle status (bearer token; ingestion normally happens via MQTT listeners, not this endpoint).",
      },
    ],
  },
  {
    name: "Sensors",
    color: "bg-yellow-500 text-white",
    endpoints: [
      {
        method: "POST",
        path: "/sensor-types",
        auth: true,
        perm: "sensor_types.manage",
        desc: "Create a new sensor type.",
      },
      {
        method: "GET",
        path: "/sensor-types",
        auth: true,
        desc: "List all sensor types.",
      },
      {
        method: "GET",
        path: "/sensor-types/:sensor_type_id",
        auth: true,
        desc: "Get sensor type details.",
      },
      {
        method: "PUT",
        path: "/sensor-types/:sensor_type_id",
        auth: true,
        perm: "sensor_types.manage",
        desc: "Update a sensor type.",
      },
      {
        method: "DELETE",
        path: "/sensor-types/:sensor_type_id",
        auth: true,
        perm: "sensor_types.manage",
        desc: "Delete a sensor type.",
      },
      {
        method: "POST",
        path: "/sensors",
        auth: true,
        perm: "sensors.manage",
        desc: "Add a new sensor.",
      },
      {
        method: "GET",
        path: "/sensors",
        auth: true,
        desc: "List all sensors.",
      },
      {
        method: "GET",
        path: "/sensors/status",
        auth: true,
        desc: "Status of all vehicle-sensor assignments.",
      },
      {
        method: "GET",
        path: "/sensors/:sensor_id",
        auth: true,
        desc: "Get sensor details.",
      },
      {
        method: "GET",
        path: "/sensors/code/:sensor_code",
        auth: true,
        desc: "Find a sensor by code.",
      },
      {
        method: "PUT",
        path: "/sensors/:sensor_id",
        auth: true,
        perm: "sensors.manage",
        desc: "Update a sensor.",
      },
      {
        method: "DELETE",
        path: "/sensors/:sensor_id",
        auth: true,
        perm: "sensors.manage",
        desc: "Delete a sensor.",
      },
      {
        method: "POST",
        path: "/vehicles/:vehicle_id/sensors",
        auth: true,
        desc: "Attach a sensor to a vehicle.",
      },
      {
        method: "GET",
        path: "/vehicles/:vehicle_id/sensors",
        auth: true,
        desc: "List sensors attached to a vehicle.",
      },
      {
        method: "GET",
        path: "/vehicles/:vehicle_id/sensors/status",
        auth: true,
        desc: "Status of sensors on a vehicle.",
      },
      {
        method: "DELETE",
        path: "/vehicles/:vehicle_id/sensors/:sensor_id",
        auth: true,
        desc: "Detach a sensor from a vehicle.",
      },
      {
        method: "PUT",
        path: "/vehicles/:vehicle_id/sensors/:sensor_id/status",
        auth: true,
        desc: "Update sensor status on a vehicle.",
      },
    ],
  },
  {
    name: "Missions",
    color: "bg-orange-500 text-white",
    endpoints: [
      {
        method: "POST",
        path: "/missions",
        auth: true,
        desc: "Create a new mission.",
      },
      {
        method: "GET",
        path: "/missions",
        auth: true,
        desc: "List all missions owned by the user.",
      },
      {
        method: "GET",
        path: "/missions/stats",
        auth: true,
        desc: "Mission statistics.",
      },
      {
        method: "GET",
        path: "/missions/ongoing",
        auth: true,
        desc: "List currently running missions.",
      },
      {
        method: "GET",
        path: "/missions/:mission_id",
        auth: true,
        desc: "Get mission details by ID.",
      },
      {
        method: "PUT",
        path: "/missions/:mission_id",
        auth: true,
        desc: "Update a mission.",
      },
      {
        method: "POST",
        path: "/missions/:mission_id/upload-to-vehicle",
        auth: true,
        desc: "Upload mission waypoints to the vehicle via MQTT.",
      },
      {
        method: "GET",
        path: "/missions/pending-upload",
        auth: true,
        desc: "Get missions pending upload.",
      },
      {
        method: "PUT",
        path: "/missions/:id/progress",
        auth: true,
        desc: "Update mission progress from the vehicle.",
      },
      {
        method: "POST",
        path: "/missions/waypoint-reached",
        auth: true,
        desc: "Notify that a waypoint was reached by the vehicle.",
      },
      {
        method: "DELETE",
        path: "/missions/:mission_id",
        auth: true,
        desc: "Delete a mission.",
      },
    ],
  },
  {
    name: "Logs",
    color: "bg-purple-600 text-white",
    endpoints: [
      {
        method: "GET",
        path: "/sensor-logs",
        auth: true,
        desc: "Query sensor logs (filter: vehicle_id, sensor_id, time).",
      },
      {
        method: "GET",
        path: "/sensor-logs/:id",
        auth: true,
        desc: "Get sensor log details.",
      },
      {
        method: "GET",
        path: "/sensor-logs/export",
        auth: true,
        desc: "Export sensor logs to CSV.",
      },
      {
        method: "POST",
        path: "/sensor-logs/import",
        auth: true,
        desc: "Import sensor logs from CSV.",
      },
      {
        method: "POST",
        path: "/sensor-logs",
        auth: true,
        desc: "Submit sensor log from the vehicle.",
      },
      {
        method: "DELETE",
        path: "/sensor-logs/:id",
        auth: true,
        desc: "Delete a sensor log.",
      },
      {
        method: "GET",
        path: "/vehicle-logs",
        auth: true,
        desc: "Query vehicle telemetry logs (filter: vehicle_id, time).",
      },
      {
        method: "GET",
        path: "/vehicle-logs/:id",
        auth: true,
        desc: "Get telemetry log details.",
      },
      {
        method: "GET",
        path: "/vehicle-logs/latest/:vehicle_id",
        auth: true,
        desc: "Latest telemetry log for a vehicle.",
      },
      {
        method: "GET",
        path: "/vehicle-logs/export",
        auth: true,
        desc: "Export telemetry logs to CSV.",
      },
      {
        method: "POST",
        path: "/vehicle-logs/import",
        auth: true,
        desc: "Import telemetry logs from CSV.",
      },
      {
        method: "POST",
        path: "/vehicle-logs",
        auth: true,
        desc: "Submit telemetry log from the vehicle.",
      },
      {
        method: "DELETE",
        path: "/vehicle-logs/:id",
        auth: true,
        desc: "Delete a telemetry log.",
      },
      {
        method: "GET",
        path: "/raw-logs",
        auth: true,
        desc: "Query raw logs (filter: search, time).",
      },
      {
        method: "GET",
        path: "/raw-logs/stats",
        auth: true,
        desc: "Raw log statistics.",
      },
      {
        method: "GET",
        path: "/raw-logs/export",
        auth: true,
        desc: "Export raw logs to CSV.",
      },
      {
        method: "POST",
        path: "/raw-logs/import",
        auth: true,
        desc: "Import raw logs from CSV.",
      },
      {
        method: "GET",
        path: "/raw-logs/:id",
        auth: true,
        desc: "Get raw log details.",
      },
      {
        method: "POST",
        path: "/raw-logs",
        auth: true,
        desc: "Submit a raw log from the vehicle.",
      },
      {
        method: "DELETE",
        path: "/raw-logs/:id",
        auth: true,
        desc: "Delete a raw log.",
      },
      {
        method: "GET",
        path: "/logs/stats",
        auth: true,
        desc: "Combined statistics across all log types.",
      },
      {
        method: "GET",
        path: "/logs/chart",
        auth: true,
        desc: "Log chart data for visualization.",
      },
    ],
  },
  {
    name: "Alerts & Notifications",
    color: "bg-red-600 text-white",
    endpoints: [
      {
        method: "GET",
        path: "/alerts",
        auth: true,
        desc: "List active alerts (anti-theft, failsafe).",
      },
      { method: "GET", path: "/alerts/:id", auth: true, desc: "Get alert details." },
      {
        method: "PATCH",
        path: "/alerts/:id/acknowledge",
        auth: true,
        desc: "Acknowledge an alert.",
      },
      {
        method: "PATCH",
        path: "/alerts/acknowledge-all",
        auth: true,
        desc: "Acknowledge all alerts.",
      },
      {
        method: "DELETE",
        path: "/alerts/clear",
        auth: true,
        desc: "Clear (delete) all alerts.",
      },
      {
        method: "GET",
        path: "/notifications",
        auth: true,
        desc: "List user notifications.",
      },
      {
        method: "PUT",
        path: "/notifications/:id/read",
        auth: true,
        desc: "Mark a notification as read.",
      },
      {
        method: "PUT",
        path: "/notifications/read-all",
        auth: true,
        desc: "Mark all notifications as read.",
      },
    ],
  },
  {
    name: "Control & Commands",
    color: "bg-indigo-600 text-white",
    endpoints: [
      {
        method: "POST",
        path: "/control/:vehicle_code/command",
        auth: true,
        desc: "Send a vehicle command via MQTT through the backend.",
      },
      {
        method: "GET",
        path: "/commands/pending",
        auth: true,
        desc: "Fetch pending commands for the vehicle.",
      },
      {
        method: "POST",
        path: "/command-acks",
        auth: true,
        desc: "Submit command ACK from the vehicle to the backend.",
      },
      {
        method: "POST",
        path: "/waypoint-acks",
        auth: true,
        desc: "Submit waypoint ACK from the vehicle to the backend.",
      },
      {
        method: "POST",
        path: "/thruster-commands",
        auth: true,
        desc: "Create a thruster command for a vehicle.",
      },
      {
        method: "GET",
        path: "/thruster-commands/pending",
        auth: true,
        desc: "Poll pending thruster commands for the vehicle.",
      },
      {
        method: "GET",
        path: "/command-logs",
        auth: true,
        desc: "History of commands sent to the vehicle.",
      },
      {
        method: "GET",
        path: "/waypoint-logs",
        auth: true,
        desc: "History of waypoints reached by the vehicle.",
      },
      {
        method: "GET",
        path: "/thruster-logs",
        auth: true,
        desc: "History of thruster commands sent to the vehicle.",
      },
    ],
  },
  {
    name: "Device Lock",
    color: "bg-violet-600 text-white",
    endpoints: [
      {
        method: "POST",
        path: "/device-lock/acquire",
        auth: true,
        desc: "Acquire the Control page device lock for a vehicle (max 2 concurrent sessions, 30s TTL).",
      },
      {
        method: "POST",
        path: "/device-lock/heartbeat",
        auth: true,
        desc: "Renew an acquired device lock while the Control page stays open.",
      },
      {
        method: "POST",
        path: "/device-lock/release",
        auth: true,
        desc: "Release the device lock (e.g. when leaving the Control page).",
      },
      {
        method: "GET",
        path: "/device-lock/status",
        auth: true,
        desc: "Get current lock status/session count for a vehicle.",
      },
    ],
  },
  {
    name: "AI Assistant",
    color: "bg-fuchsia-600 text-white",
    endpoints: [
      {
        method: "POST",
        path: "/ai/chat",
        auth: true,
        desc: "Send a chat message to the SeaPortal AI assistant (OpenRouter-backed, rate-limited).",
      },
      {
        method: "POST",
        path: "/ai/chat/stream",
        auth: true,
        desc: "Same as /ai/chat but streams the response.",
      },
      {
        method: "POST",
        path: "/ai/weather-analysis",
        auth: true,
        desc: "AI-generated weather analysis for the Weather page.",
      },
      {
        method: "POST",
        path: "/ai/battery-analysis",
        auth: true,
        desc: "AI-generated battery analysis (implemented, but the panel is currently hidden on the Battery page).",
      },
      {
        method: "GET",
        path: "/ai/sessions",
        auth: true,
        desc: "List the current user's chat sessions.",
      },
      {
        method: "GET",
        path: "/ai/sessions/:id/messages",
        auth: true,
        desc: "Get messages for a chat session.",
      },
      {
        method: "DELETE",
        path: "/ai/sessions/:id",
        auth: true,
        desc: "Delete a chat session.",
      },
    ],
  },
  {
    name: "Publications & Team",
    color: "bg-sky-600 text-white",
    endpoints: [
      {
        method: "GET",
        path: "/publications",
        auth: false,
        desc: "List publications (public — academic papers/reports library).",
      },
      {
        method: "GET",
        path: "/publications/:id",
        auth: false,
        desc: "Get publication details (public).",
      },
      {
        method: "POST",
        path: "/publications",
        auth: true,
        perm: "publications.manage",
        desc: "Create a publication.",
      },
      {
        method: "POST",
        path: "/publications/upload-pdf",
        auth: true,
        perm: "publications.manage",
        desc: "Upload a publication PDF.",
      },
      {
        method: "GET",
        path: "/team",
        auth: false,
        desc: "List team members (public).",
      },
      {
        method: "POST",
        path: "/team",
        auth: true,
        desc: "Create a team member.",
      },
    ],
  },
];

const METHOD_COLOR = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-yellow-500",
  DELETE: "bg-red-500",
  PATCH: "bg-orange-500",
};

const EndpointRow = ({ method, path, auth, perm, desc }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span
      className={`shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded mt-0.5 w-14 text-center ${METHOD_COLOR[method] || "bg-gray-500"}`}
    >
      {method}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
          {path}
        </code>
        {auth === true && (
          <span
            title="JWT required"
            className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400"
          >
            <FaLock className="text-[9px]" /> JWT
          </span>
        )}
        {auth === false && (
          <span
            title="Public"
            className="flex items-center gap-0.5 text-[10px] text-gray-400"
          >
            <FaUnlock className="text-[9px]" /> Public
          </span>
        )}
        {perm && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono">
            {perm}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
    </div>
  </div>
);

const LS_KEY = "apidocs_open_groups";

const GroupCard = ({ name, color, endpoints }) => {
  const [open, setOpen] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return saved[name] ?? false;
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({ ...saved, [name]: next }),
        );
      } catch {}
      return next;
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => toggle()}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}
        >
          {name}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-400 text-xs ml-2">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4">
          {endpoints.map((ep) => (
            <EndpointRow key={`${ep.method}-${ep.path}`} {...ep} />
          ))}
        </div>
      )}
    </div>
  );
};

const ApiDocs = () => {
  useTitle("API Documentation — SeaPortal");
  const navigate = useNavigate();

  const totalEndpoints = GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors"
      >
        <FaChevronLeft className="text-xs" /> Kembali
      </button>

      {/* Hero */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
          <FaCode className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            API Documentation
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            REST API endpoint reference — {totalEndpoints} endpoints
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 text-sm">
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Base URL
            </p>
            <code className="text-purple-600 dark:text-purple-400 font-mono">
              /api
            </code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Auth Header
            </p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">
              Authorization: Bearer &lt;token&gt;
            </code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Content-Type
            </p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">
              application/json
            </code>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <FaLock className="text-amber-500 text-[10px]" /> JWT — access token
            dari /auth/login
          </span>
          <span className="flex items-center gap-1">
            <FaUnlock className="text-gray-400 text-[10px]" /> Public — tidak
            perlu auth
          </span>
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map((g) => (
        <GroupCard key={g.name} {...g} />
      ))}

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex gap-3 flex-wrap">
        <button
          onClick={() => navigate("/docs/getting-started")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FaArrowLeft className="text-xs" /> Getting Started
        </button>
        <button
          onClick={() => navigate("/docs/mqtt")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          MQTT Topics <FaArrowRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default ApiDocs;
