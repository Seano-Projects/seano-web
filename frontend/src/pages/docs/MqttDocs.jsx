import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBroadcastTower, FaChevronLeft, FaArrowLeft, FaArrowRight, FaCopy, FaCheck } from "react-icons/fa";
import useTitle from "../../hooks/useTitle";

const TOPICS = [
  {
    topic: "seano/{vehicle_code}/status",
    direction: "SUB",
    desc: "Status koneksi kendaraan (LWT). Payload: online | offline | idle.",
    payload: `"online"`,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    topic: "seano/{vehicle_code}/telemetry",
    direction: "SUB",
    desc: "Data telemetri realtime: GPS, heading, kecepatan, mode flight, armed status, RSSI, suhu.",
    payload: `{
  "lat": -6.8612,
  "lon": 108.1031,
  "alt": 0.0,
  "heading": 45.2,
  "speed": 1.5,
  "mode": "GUIDED",
  "armed": true,
  "rssi": -72,
  "temp": 38.5
}`,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  {
    topic: "seano/{vehicle_code}/battery",
    direction: "SUB",
    desc: "Data baterai: SOC, tegangan, arus, kapasitas, tegangan per-cell.",
    payload: `{
  "pack_id": 1,
  "soc": 85.2,
  "voltage": 48.6,
  "current": -2.3,
  "capacity": 10000,
  "cells": [3.84, 3.84, 3.83, 3.85, 3.84, 3.84, 3.83, 3.85,
             3.84, 3.84, 3.83, 3.85, 3.84, 3.84]
}`,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  {
    topic: "seano/{vehicle_code}/raw",
    direction: "SUB",
    desc: "Raw log dari kendaraan — string teks mentah untuk debugging.",
    payload: `"[INFO] GPS fix acquired at -6.8612, 108.1031"`,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  {
    topic: "seano/{vehicle_code}/{sensor_type}/data",
    direction: "SUB",
    desc: "Data sensor spesifik. sensor_type: ctd, adcp, sbes, mbes.",
    payload: `{
  "vehicle_code": "USV-001",
  "sensor_type": "ctd",
  "timestamp": "2026-04-18T12:00:00Z",
  "values": { "temp": 28.4, "salinity": 34.1, "depth": 5.2 }
}`,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  {
    topic: "seano/{vehicle_code}/mission/waypoint_reached",
    direction: "SUB",
    desc: "Notifikasi saat kendaraan mencapai waypoint dalam misi aktif.",
    payload: `{ "waypoint_index": 3, "mission_id": 12 }`,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  {
    topic: "seano/{vehicle_code}/command",
    direction: "PUB",
    desc: "Kirim perintah ke kendaraan: arm, disarm, mode change, dll.",
    payload: `{
  "command": "SET_MODE",
  "params": { "mode": "GUIDED" }
}`,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  {
    topic: "seano/{vehicle_code}/ack",
    direction: "SUB",
    desc: "Acknowledgment dari kendaraan setelah menerima command.",
    payload: `{ "status": "ok", "command": "SET_MODE" }`,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  {
    topic: "seano/{vehicle_code}/mission",
    direction: "PUB",
    desc: "Upload waypoint misi ke kendaraan.",
    payload: `{
  "mission_id": 12,
  "waypoints": [
    { "seq": 0, "lat": -6.861, "lon": 108.103, "alt": 0 },
    { "seq": 1, "lat": -6.862, "lon": 108.104, "alt": 0 }
  ]
}`,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  {
    topic: "seano/{vehicle_code}/antitheft/alert",
    direction: "SUB",
    desc: "Alert anti-pencurian dari kendaraan.",
    payload: `{ "type": "antitheft", "severity": "high", "message": "Unauthorized movement detected" }`,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  {
    topic: "seano/{vehicle_code}/failsafe/alert",
    direction: "SUB",
    desc: "Alert failsafe (baterai rendah, kehilangan sinyal, dll).",
    payload: `{ "type": "failsafe", "severity": "critical", "message": "Low battery failsafe triggered" }`,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
];

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
      {copied ? <FaCheck className="text-xs text-green-500" /> : <FaCopy className="text-xs" />}
    </button>
  );
};

const TopicCard = ({ topic, direction, desc, payload, color }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${color}`}>
          {direction}
        </span>
        <div className="min-w-0 flex-1">
          <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{topic}</code>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
        </div>
        <span className="text-gray-400 text-xs mt-1 shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-950 relative">
          <pre className="text-xs text-green-400 px-4 py-3 overflow-x-auto">{payload}</pre>
          <CopyBtn text={payload} />
        </div>
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">MQTT Topics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Referensi topik MQTT untuk integrasi USV ↔ SeaPortal</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 text-sm">
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pattern prefix</p>
            <code className="text-blue-600 dark:text-blue-400 font-mono">seano/{"{vehicle_code}"}/..</code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">QoS</p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">1 (at least once)</code>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Format payload</p>
            <code className="text-gray-800 dark:text-gray-200 font-mono">JSON / String</code>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          <span className="font-medium">SUB</span> = server subscribe (data masuk dari kendaraan) ·{" "}
          <span className="font-medium">PUB</span> = server publish (perintah ke kendaraan)
        </p>
      </div>

      {/* Subscribe Topics */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        Subscribe — Data dari Kendaraan
      </h2>
      <div className="space-y-2 mb-8">
        {subTopics.map((t) => <TopicCard key={t.topic} {...t} />)}
      </div>

      {/* Publish Topics */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        Publish — Perintah ke Kendaraan
      </h2>
      <div className="space-y-2 mb-8">
        {pubTopics.map((t) => <TopicCard key={t.topic} {...t} />)}
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
