import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCode, FaChevronLeft, FaArrowLeft, FaArrowRight, FaLock, FaUnlock } from "react-icons/fa";
import useTitle from "../../hooks/useTitle";

const GROUPS = [
  {
    name: "Auth",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    endpoints: [
      { method: "POST", path: "/auth/register-email", auth: false, desc: "Daftarkan email baru untuk mendapatkan link verifikasi." },
      { method: "POST", path: "/auth/verify-email", auth: false, desc: "Verifikasi email dengan token dari link." },
      { method: "POST", path: "/auth/set-credentials", auth: false, desc: "Set password dan data akun setelah verifikasi email." },
      { method: "POST", path: "/auth/resend-verification", auth: false, desc: "Kirim ulang email verifikasi." },
      { method: "POST", path: "/auth/login", auth: false, desc: "Login dan dapatkan access token + refresh token." },
      { method: "POST", path: "/auth/refresh", auth: false, desc: "Perbarui access token menggunakan refresh token." },
      { method: "GET",  path: "/auth/me", auth: true, desc: "Dapatkan data profil user yang sedang login." },
      { method: "POST", path: "/auth/logout", auth: true, desc: "Logout dan invalidasi token." },
    ],
  },
  {
    name: "Users",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    endpoints: [
      { method: "POST",   path: "/users", auth: true, perm: "users.create", desc: "Buat user baru." },
      { method: "GET",    path: "/users", auth: true, perm: "users.read", desc: "Daftar semua user." },
      { method: "GET",    path: "/users/:user_id", auth: true, desc: "Detail user berdasarkan ID." },
      { method: "PUT",    path: "/users/:user_id", auth: true, desc: "Update data user (ownership check)." },
      { method: "DELETE", path: "/users/:user_id", auth: true, perm: "users.delete", desc: "Hapus user." },
    ],
  },
  {
    name: "Vehicles",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    endpoints: [
      { method: "POST",   path: "/vehicles", auth: true, desc: "Daftarkan kendaraan baru." },
      { method: "GET",    path: "/vehicles", auth: true, desc: "Daftar semua kendaraan milik user." },
      { method: "GET",    path: "/vehicles/connection-statuses", auth: true, desc: "Status koneksi MQTT (LWT) semua kendaraan." },
      { method: "GET",    path: "/vehicles/:vehicle_id", auth: true, desc: "Detail kendaraan berdasarkan ID." },
      { method: "PUT",    path: "/vehicles/:vehicle_id", auth: true, desc: "Update data kendaraan." },
      { method: "DELETE", path: "/vehicles/:vehicle_id", auth: true, desc: "Hapus kendaraan." },
      { method: "POST",   path: "/vehicles/:vehicle_id/api-key", auth: true, desc: "Generate API key per-kendaraan untuk autentikasi MQTT/HTTP." },
      { method: "GET",    path: "/vehicles/:vehicle_id/battery", auth: true, desc: "Status baterai terbaru kendaraan." },
      { method: "GET",    path: "/vehicles/:vehicle_id/battery-logs", auth: true, desc: "Riwayat log baterai kendaraan." },
      { method: "GET",    path: "/vehicle-batteries/latest", auth: true, desc: "Status baterai terbaru semua kendaraan." },
      { method: "POST",   path: "/vehicle-batteries", auth: "apikey", desc: "Kirim data baterai dari kendaraan (Vehicle API Key)." },
      { method: "POST",   path: "/vehicle-status", auth: "apikey", desc: "Kirim status kendaraan dari perangkat (Vehicle API Key)." },
    ],
  },
  {
    name: "Sensors",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    endpoints: [
      { method: "POST",   path: "/sensor-types", auth: true, perm: "sensor_types.manage", desc: "Buat tipe sensor baru." },
      { method: "GET",    path: "/sensor-types", auth: true, desc: "Daftar semua tipe sensor." },
      { method: "GET",    path: "/sensor-types/:sensor_type_id", auth: true, desc: "Detail tipe sensor." },
      { method: "PUT",    path: "/sensor-types/:sensor_type_id", auth: true, perm: "sensor_types.manage", desc: "Update tipe sensor." },
      { method: "DELETE", path: "/sensor-types/:sensor_type_id", auth: true, perm: "sensor_types.manage", desc: "Hapus tipe sensor." },
      { method: "POST",   path: "/sensors", auth: true, perm: "sensors.manage", desc: "Tambah sensor baru." },
      { method: "GET",    path: "/sensors", auth: true, desc: "Daftar semua sensor." },
      { method: "GET",    path: "/sensors/status", auth: true, desc: "Status semua vehicle-sensor." },
      { method: "GET",    path: "/sensors/:sensor_id", auth: true, desc: "Detail sensor." },
      { method: "GET",    path: "/sensors/code/:sensor_code", auth: true, desc: "Cari sensor berdasarkan kode." },
      { method: "PUT",    path: "/sensors/:sensor_id", auth: true, perm: "sensors.manage", desc: "Update sensor." },
      { method: "DELETE", path: "/sensors/:sensor_id", auth: true, perm: "sensors.manage", desc: "Hapus sensor." },
      { method: "POST",   path: "/vehicles/:vehicle_id/sensors", auth: true, desc: "Pasangkan sensor ke kendaraan." },
      { method: "GET",    path: "/vehicles/:vehicle_id/sensors", auth: true, desc: "Sensor yang dipasang di kendaraan." },
      { method: "GET",    path: "/vehicles/:vehicle_id/sensors/status", auth: true, desc: "Status sensor di kendaraan." },
      { method: "DELETE", path: "/vehicles/:vehicle_id/sensors/:sensor_id", auth: true, desc: "Lepaskan sensor dari kendaraan." },
      { method: "PUT",    path: "/vehicles/:vehicle_id/sensors/:sensor_id/status", auth: true, desc: "Update status sensor pada kendaraan." },
    ],
  },
  {
    name: "Missions",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    endpoints: [
      { method: "POST",   path: "/missions", auth: true, desc: "Buat misi baru." },
      { method: "GET",    path: "/missions", auth: true, desc: "Daftar semua misi milik user." },
      { method: "GET",    path: "/missions/stats", auth: true, desc: "Statistik misi." },
      { method: "GET",    path: "/missions/ongoing", auth: true, desc: "Daftar misi yang sedang berlangsung." },
      { method: "GET",    path: "/missions/:mission_id", auth: true, desc: "Detail misi berdasarkan ID." },
      { method: "PUT",    path: "/missions/:mission_id", auth: true, desc: "Update misi." },
      { method: "POST",   path: "/missions/:mission_id/upload-to-vehicle", auth: true, desc: "Upload waypoint misi ke kendaraan via MQTT." },
      { method: "GET",    path: "/missions/pending-upload", auth: "apikey", desc: "Dapatkan misi yang belum diupload (Vehicle API Key)." },
      { method: "PUT",    path: "/missions/:id/progress", auth: "apikey", desc: "Update progres misi dari kendaraan." },
      { method: "POST",   path: "/missions/waypoint-reached", auth: "apikey", desc: "Notifikasi waypoint tercapai dari kendaraan." },
      { method: "DELETE", path: "/missions/:mission_id", auth: true, desc: "Hapus misi." },
    ],
  },
  {
    name: "Logs",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    endpoints: [
      { method: "GET",    path: "/sensor-logs", auth: true, desc: "Query log sensor (filter: vehicle_id, sensor_id, waktu)." },
      { method: "GET",    path: "/sensor-logs/:id", auth: true, desc: "Detail log sensor." },
      { method: "GET",    path: "/sensor-logs/export", auth: true, desc: "Export log sensor ke CSV." },
      { method: "POST",   path: "/sensor-logs/import", auth: true, desc: "Import log sensor dari CSV." },
      { method: "POST",   path: "/sensor-logs", auth: "apikey", desc: "Kirim log sensor dari kendaraan." },
      { method: "DELETE", path: "/sensor-logs/:id", auth: true, desc: "Hapus log sensor." },
      { method: "GET",    path: "/vehicle-logs", auth: true, desc: "Query log telemetri kendaraan (filter: vehicle_id, waktu)." },
      { method: "GET",    path: "/vehicle-logs/:id", auth: true, desc: "Detail log telemetri." },
      { method: "GET",    path: "/vehicle-logs/latest/:vehicle_id", auth: true, desc: "Log telemetri terbaru kendaraan." },
      { method: "GET",    path: "/vehicle-logs/export", auth: true, desc: "Export log telemetri ke CSV." },
      { method: "POST",   path: "/vehicle-logs/import", auth: true, desc: "Import log telemetri dari CSV." },
      { method: "POST",   path: "/vehicle-logs", auth: "apikey", desc: "Kirim log telemetri dari kendaraan." },
      { method: "DELETE", path: "/vehicle-logs/:id", auth: true, desc: "Hapus log telemetri." },
      { method: "GET",    path: "/raw-logs", auth: true, desc: "Query raw log (filter: search, waktu)." },
      { method: "GET",    path: "/raw-logs/stats", auth: true, desc: "Statistik raw log." },
      { method: "GET",    path: "/raw-logs/export", auth: true, desc: "Export raw log ke CSV." },
      { method: "POST",   path: "/raw-logs/import", auth: true, desc: "Import raw log dari CSV." },
      { method: "GET",    path: "/raw-logs/:id", auth: true, desc: "Detail raw log." },
      { method: "POST",   path: "/raw-logs", auth: "apikey", desc: "Kirim raw log dari kendaraan." },
      { method: "DELETE", path: "/raw-logs/:id", auth: true, desc: "Hapus raw log." },
      { method: "GET",    path: "/logs/stats", auth: true, desc: "Statistik gabungan semua log." },
      { method: "GET",    path: "/logs/chart", auth: true, desc: "Data chart log untuk visualisasi." },
    ],
  },
  {
    name: "Alerts & Notifications",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    endpoints: [
      { method: "GET",    path: "/alerts", auth: true, desc: "Daftar alert aktif (anti-theft, failsafe)." },
      { method: "GET",    path: "/alerts/:id", auth: true, desc: "Detail alert." },
      { method: "PUT",    path: "/alerts/:id/acknowledge", auth: true, desc: "Acknowledge alert." },
      { method: "GET",    path: "/notifications", auth: true, desc: "Daftar notifikasi user." },
      { method: "PUT",    path: "/notifications/:id/read", auth: true, desc: "Tandai notifikasi sebagai dibaca." },
      { method: "PUT",    path: "/notifications/read-all", auth: true, desc: "Tandai semua notifikasi sebagai dibaca." },
    ],
  },
  {
    name: "Control & Commands",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    endpoints: [
      { method: "POST", path: "/control/arm", auth: true, desc: "Arm kendaraan." },
      { method: "POST", path: "/control/disarm", auth: true, desc: "Disarm kendaraan." },
      { method: "POST", path: "/control/set-mode", auth: true, desc: "Ubah flight mode kendaraan." },
      { method: "POST", path: "/control/rtl", auth: true, desc: "Perintah Return To Launch." },
      { method: "GET",  path: "/command-logs", auth: true, desc: "Riwayat perintah yang dikirim ke kendaraan." },
      { method: "GET",  path: "/waypoint-logs", auth: true, desc: "Riwayat waypoint yang dicapai kendaraan." },
      { method: "GET",  path: "/thruster-commands", auth: true, desc: "Riwayat perintah thruster." },
    ],
  },
  {
    name: "Roles & Permissions",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
    endpoints: [
      { method: "POST",   path: "/roles", auth: true, perm: "roles.manage", desc: "Buat role baru." },
      { method: "GET",    path: "/roles", auth: true, perm: "roles.read", desc: "Daftar semua role." },
      { method: "GET",    path: "/roles/:id", auth: true, perm: "roles.read", desc: "Detail role." },
      { method: "PUT",    path: "/roles/:id", auth: true, perm: "roles.manage", desc: "Update role." },
      { method: "DELETE", path: "/roles/:id", auth: true, perm: "roles.manage", desc: "Hapus role." },
      { method: "POST",   path: "/permissions", auth: true, perm: "permissions.manage", desc: "Buat permission baru." },
      { method: "GET",    path: "/permissions", auth: true, perm: "permissions.read", desc: "Daftar semua permission." },
      { method: "GET",    path: "/permissions/:id", auth: true, perm: "permissions.read", desc: "Detail permission." },
      { method: "PUT",    path: "/permissions/:id", auth: true, perm: "permissions.manage", desc: "Update permission." },
      { method: "DELETE", path: "/permissions/:id", auth: true, perm: "permissions.manage", desc: "Hapus permission." },
      { method: "POST",   path: "/permissions/assign-to-role", auth: true, perm: "permissions.manage", desc: "Assign permission ke role." },
      { method: "DELETE", path: "/permissions/remove-from-role/:role_id/:permission_id", auth: true, perm: "permissions.manage", desc: "Hapus permission dari role." },
    ],
  },
];

const METHOD_COLOR = {
  GET:    "bg-blue-500",
  POST:   "bg-green-500",
  PUT:    "bg-yellow-500",
  DELETE: "bg-red-500",
  PATCH:  "bg-orange-500",
};

const EndpointRow = ({ method, path, auth, perm, desc }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span className={`shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded mt-0.5 w-14 text-center ${METHOD_COLOR[method] || "bg-gray-500"}`}>
      {method}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{path}</code>
        {auth === true && (
          <span title="JWT required" className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
            <FaLock className="text-[9px]" /> JWT
          </span>
        )}
        {auth === "apikey" && (
          <span title="Vehicle API Key" className="flex items-center gap-0.5 text-[10px] text-blue-500">
            <FaLock className="text-[9px]" /> API Key
          </span>
        )}
        {auth === false && (
          <span title="Public" className="flex items-center gap-0.5 text-[10px] text-gray-400">
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
        localStorage.setItem(LS_KEY, JSON.stringify({ ...saved, [name]: next }));
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
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{name}</span>
        <span className="text-xs text-gray-400 ml-auto">{endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}</span>
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">REST API endpoint reference — {totalEndpoints} endpoints</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 text-sm">
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Base URL</p>
            <code className="text-purple-600 dark:text-purple-400 font-mono">/api</code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Auth Header</p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">Authorization: Bearer &lt;token&gt;</code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Content-Type</p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">application/json</code>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><FaLock className="text-amber-500 text-[10px]" /> JWT — access token dari /auth/login</span>
          <span className="flex items-center gap-1"><FaLock className="text-blue-500 text-[10px]" /> API Key — vehicle key dari /vehicles/:id/api-key</span>
          <span className="flex items-center gap-1"><FaUnlock className="text-gray-400 text-[10px]" /> Public — tidak perlu auth</span>
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
