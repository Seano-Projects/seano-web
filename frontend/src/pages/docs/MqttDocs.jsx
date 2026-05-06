import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBroadcastTower,
  FaChevronLeft,
  FaArrowLeft,
  FaArrowRight,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import useTitle from "../../hooks/useTitle";

const TOPICS = [
  {
    topic: "seano/{vehicle_code}/status",
    direction: "SUB",
    qos: 1,
    desc: "Status koneksi kendaraan (LWT). Bisa plain string 'online'/'offline' atau JSON.",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "status": "online",
  "timestamp": "2026-04-27T14:00:00Z"
}`,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    topic: "seano/{vehicle_code}/telemetry",
    direction: "SUB",
    qos: 1,
    desc: "Data telemetri realtime kendaraan. Semua field bersifat opsional kecuali vehicle_code.",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "mission_code": "MSN-a1b2c3d4",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "altitude": 10.5,
  "heading": 90.5,
  "speed": 5.2,
  "mode": "AUTO",
  "armed": true,
  "gps_ok": true,
  "rssi": -65,
  "roll": 0.5,
  "pitch": 1.2,
  "yaw": 90.5,
  "battery_voltage": 12.5,
  "battery_current": 2.3,
  "battery_percentage": 85.5,
  "system_status": "OK",
  "temperature_system": "Normal"
}`,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  {
    topic: "seano/{vehicle_code}/battery",
    direction: "SUB",
    qos: 1,
    desc: "Data baterai kendaraan. battery_id dan percentage wajib; field lain opsional.",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "battery_id": 1,
  "percentage": 85.5,
  "voltage": 48.6,
  "current": -2.3,
  "temperature": 38.5,
  "status": "discharging",
  "cell_voltages": [3.84, 3.84, 3.83, 3.85],
  "cell_count": 4
}`,
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  {
    topic: "seano/{vehicle_code}/raw",
    direction: "SUB",
    qos: 1,
    desc: "Raw log dari kendaraan. Bisa plain string atau JSON dengan field 'logs'/'message'/'text'/'log' (prioritas berurutan).",
    payload: `"[INFO] GPS fix acquired at -6.2088, 106.8456"`,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  {
    topic: "seano/{vehicle_code}/CTD-MIDAS-3000/data",
    direction: "SUB",
    qos: 1,
    desc: "Data sensor spesifik. Format topic: seano/{vehicle_code}/{sensor_code}/data. Payload bebas (key-value JSON). Contoh: CTD.",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "sensor_code": "CTD-MIDAS-3000",
  "date_time": "2026-04-27T14:00:00Z",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "altitude": 0.5,
  "gps_ok": true,
  "temperature": 28.4,
  "salinity": 34.1,
  "depth": 5.2,
  "pressure": 5.3,
  "conductivity": 50.1,
  "density": 1024.5,
  "sound_velocity": 1524.3
}`,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  {
    topic: "seano/{vehicle_code}/ADCP-WORKHORSE/data",
    direction: "SUB",
    qos: 1,
    desc: "Data ADCP (Acoustic Doppler Current Profiler). Sensor code wajib: ADCP-WORKHORSE. Data langsung disimpan ke sensor_logs dan di-broadcast via WebSocket ke halaman monitoring ADCP.",
    payload: `{
  "vehicle_code": "USV-001",
  "sensor_code": "ADCP-WORKHORSE",
  "date_time": "2026-04-27T14:00:00Z",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "gps_ok": true,
  "heading_deg": 270.5,
  "ensemble_no": 1042,
  "current_speed_ms": 0.452,
  "current_direction_deg": 185.3,
  "water_depth_m": 24.7,
  "temperature_c": 28.6,
  "v1_ms": -0.052,
  "v2_ms": 0.089,
  "v3_ms": -0.031,
  "v4_ms": 0.047
}`,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    notes: [
      "vehicle_code & sensor_code wajib (bisa dari topic atau di dalam payload)",
      "date_time format ISO 8601 — jika kosong, server pakai waktu penerimaan",
      "v1_ms–v4_ms: kecepatan beam individual (negatif = menuju transduser)",
      "current_direction_deg: 0–360° (0 = Utara, searah jarum jam)",
      "Data otomatis muncul di halaman /sensor-monitoring/adcp",
    ],
  },
  {
    topic: "seano/{vehicle_code}/mission/waypoint_reached",
    direction: "SUB",
    qos: 1,
    desc: "Notifikasi saat kendaraan mencapai satu waypoint dalam misi aktif.",
    payload: `{
  "vehicle_id": "{vehicle_code}",
  "event": "waypoint_reached",
  "wp_seq": 3,
  "total": 12,
  "remaining": 9
}`,
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  {
    topic: "seano/{vehicle_code}/command",
    direction: "PUB",
    qos: 1,
    desc: "Perintah dikirim server ke kendaraan. command: ARM, FORCE_ARM, DISARM, FORCE_DISARM, AUTO, MANUAL, HOLD, LOITER, RTL.",
    payload: `{
  "command": "AUTO"
}`,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  {
    topic: "seano/{vehicle_code}/mission",
    direction: "PUB",
    qos: 1,
    desc: "Server mempublish payload misi ke kendaraan via MQTT. Dikirim otomatis saat upload mission ke vehicle dari API.",
    payload: `{
  "mission_id": 12,
  "mission_code": "MSN-a1b2c3d4",
  "mission_name": "Patrol Route A",
  "vehicle_id": 1,
  "uploaded_at": "2026-04-27T14:00:00Z",
  "home_location": { "lat": -6.2088, "lng": 106.8456, "altitude": 0 },
  "parameters": { "speed": 3.0, "altitude": 10.0, "radius": 2.0 },
  "waypoints": [
    { "lat": -6.2088, "lng": 106.8456, "altitude": 10.0, "speed": 3.0 },
    { "lat": -6.2100, "lng": 106.8470, "altitude": 10.0, "speed": 3.0 }
  ]
}`,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  {
    topic: "seano/{vehicle_code}/ack",
    direction: "SUB",
    qos: 1,
    desc: "Acknowledgment dari kendaraan setelah menerima command. status: 'ok' atau 'error'.",
    payload: `{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "command": "AUTO",
  "status": "ok",
  "message": "Mode changed to AUTO"
}`,
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  {
    topic: "seano/{vehicle_code}/antitheft/alert",
    direction: "SUB",
    qos: 1,
    desc: "Alert anti-pencurian. Payload bisa plain string atau JSON. severity: warning (default).",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "message": "Unauthorized movement detected",
  "severity": "warning",
  "source": "USV",
  "latitude": -6.2088,
  "longitude": 106.8456
}`,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  {
    topic: "seano/{vehicle_code}/failsafe/alert",
    direction: "SUB",
    qos: 1,
    desc: "Alert failsafe (baterai rendah, kehilangan sinyal, dll). severity: critical (default).",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "message": "BATTERY_CRITICAL",
  "severity": "critical",
  "source": "USV",
  "latitude": -6.2088,
  "longitude": 106.8456
}`,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  {
    topic: "seano/{vehicle_code}/alert",
    direction: "SUB",
    qos: 1,
    desc: "General alert dari kendaraan — bebas dipakai untuk kondisi apapun (GPS no fix, sensor error, komunikasi terputus, dll). Field alert_type bebas diisi; jika kosong default 'general'. severity: critical / warning / info (default warning).",
    payload: `{
  "vehicle_code": "{vehicle_code}",
  "alert_type": "GPS",
  "severity": "warning",
  "message": "GPS no fix",
  "source": "USV",
  "latitude": -6.2088,
  "longitude": 106.8456
}`,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    notes: [
      "alert_type bebas: GPS, Battery, IMU, Sensor, Communication, System, dll — tidak harus failsafe/antitheft",
      "Jika alert_type tidak diisi, default ke 'general'",
      "severity: critical | warning | info (default warning)",
      "latitude & longitude opsional",
      "Alert masuk ke halaman /alerts dan di-broadcast via WebSocket ke semua client",
    ],
  },
];

// VS Code-style JSON syntax highlighter
const JsonHighlight = ({ code }) => {
  const tokens = [];
  const regex =
    /("(?:\\.|[^"\\])*")\s*(:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;
  let last = 0;
  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match.index > last) {
      tokens.push(
        <span key={last} className="text-gray-300">
          {code.slice(last, match.index)}
        </span>,
      );
    }
    if (match[1] !== undefined) {
      // string — key or value
      if (match[2]) {
        // key (followed by colon)
        tokens.push(
          <span key={match.index} className="text-[#9cdcfe]">
            {match[1]}
          </span>,
        );
        tokens.push(
          <span key={match.index + "c"} className="text-gray-300">
            :
          </span>,
        );
        last = match.index + match[0].length;
        continue;
      } else {
        tokens.push(
          <span key={match.index} className="text-[#ce9178]">
            {match[1]}
          </span>,
        );
      }
    } else if (match[3] !== undefined) {
      // boolean / null
      tokens.push(
        <span key={match.index} className="text-[#569cd6]">
          {match[3]}
        </span>,
      );
    } else if (match[4] !== undefined) {
      // number
      tokens.push(
        <span key={match.index} className="text-[#b5cea8]">
          {match[4]}
        </span>,
      );
    } else if (match[5] !== undefined) {
      // punctuation
      tokens.push(
        <span key={match.index} className="text-[#d4d4d4]">
          {match[5]}
        </span>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < code.length) {
    tokens.push(
      <span key={last} className="text-gray-300">
        {code.slice(last)}
      </span>,
    );
  }
  return <>{tokens}</>;
};

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="absolute top-2 right-2 p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-gray-500 dark:text-gray-400"
      title="Copy"
    >
      {copied ? (
        <FaCheck className="text-xs text-green-500" />
      ) : (
        <FaCopy className="text-xs" />
      )}
    </button>
  );
};

const TopicCard = ({ topic, direction, qos, desc, payload, color, notes }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <span
          className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${color}`}
        >
          {direction}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
              {topic}
            </code>
            <span
              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                qos === 0
                  ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  : qos === 1
                    ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
              }`}
            >
              QoS {qos}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {desc}
          </p>
        </div>
        <span className="text-gray-400 text-xs mt-1 shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <>
          <div className="border-t border-gray-700 bg-black relative">
            <pre className="text-xs font-mono px-4 py-3 overflow-x-auto leading-relaxed custom-scrollbar">
              <JsonHighlight code={payload} />
            </pre>
            <CopyBtn text={payload} />
          </div>
          {notes && notes.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Catatan
              </p>
              <ul className="space-y-1">
                {notes.map((note, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MqttDocs = () => {
  useTitle("MQTT Topics — SeaPortal");
  const navigate = useNavigate();

  const subTopics = TOPICS.filter((t) => t.direction === "SUB");
  const pubTopics = TOPICS.filter((t) => t.direction === "PUB");

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
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
          <FaBroadcastTower className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            MQTT Topics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Referensi topik MQTT untuk integrasi USV ↔ SeaPortal
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 text-sm">
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Pattern prefix
            </p>
            <code className="text-blue-600 dark:text-blue-400 font-mono">
              seano/{"{vehicle_code}"}/..
            </code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              QoS
            </p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">
              1 (at least once)
            </code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              Format payload
            </p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">
              JSON / string
            </code>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Gunakan `vehicle_code` dari topik. Topik sensor menggunakan
          `sensor_code` bukan `sensor_type`.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          <span className="font-medium">SUB</span> = server subscribe (data
          masuk dari kendaraan) · <span className="font-medium">PUB</span> =
          server publish (perintah ke kendaraan)
        </p>
      </div>

      {/* Subscribe Topics */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        Subscribe — Data dari Kendaraan
      </h2>
      <div className="space-y-2 mb-8">
        {subTopics.map((t) => (
          <TopicCard key={t.topic} {...t} />
        ))}
      </div>

      {/* Publish Topics */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        Publish — Perintah ke Kendaraan
      </h2>
      <div className="space-y-2 mb-8">
        {pubTopics.map((t) => (
          <TopicCard key={t.topic} {...t} />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex gap-3 flex-wrap">
        <button
          onClick={() => navigate("/docs/getting-started")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FaArrowLeft className="text-xs" /> Getting Started
        </button>
        <button
          onClick={() => navigate("/docs/api")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          API Documentation <FaArrowRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default MqttDocs;
