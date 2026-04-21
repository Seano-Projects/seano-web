import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaRocket,
  FaBroadcastTower,
  FaCode,
  FaArrowRight,
  FaBook,
  FaMapMarkedAlt,
} from "react-icons/fa";
import { MdSettingsRemote } from "react-icons/md";
import useTitle from "../../hooks/useTitle";

const CARDS = [
  {
    icon: FaRocket,
    iconBg: "bg-blue-500",
    label: "Getting Started",
    desc: "Panduan dasar — login, dashboard, misi, baterai, dan kamera. Mulai dari sini jika kamu baru pertama kali menggunakan SeaPortal.",
    to: "/docs/getting-started",
    badge: "Recommended",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    icon: FaMapMarkedAlt,
    iconBg: "bg-orange-500",
    label: "Mission Planner",
    desc: "Cara membuat misi, menggambar waypoint jalur (Path) atau area survei (Area), lalu mengupload ke kendaraan via MQTT.",
    to: "/docs/mission-planner",
    badge: "Feature",
    badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  {
    icon: MdSettingsRemote,
    iconBg: "bg-red-500",
    label: "Control Guide",
    desc: "Cara arm/disarm kendaraan, mengganti mode operasi (Manual, Auto, Hold, Loiter, RTL), dan mengontrol thruster via joystick.",
    to: "/docs/control",
    badge: "Feature",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  {
    icon: FaBroadcastTower,
    iconBg: "bg-green-500",
    label: "MQTT Topics",
    desc: "Referensi lengkap topik MQTT untuk integrasi kendaraan ↔ SeaPortal. Termasuk payload format dan arah publish/subscribe.",
    to: "/docs/mqtt",
    badge: "Integration",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  {
    icon: FaCode,
    iconBg: "bg-purple-500",
    label: "API Documentation",
    desc: "Referensi REST API endpoint — autentikasi, kendaraan, misi, log, kontrol, dan lainnya. Lengkap dengan info auth dan permission.",
    to: "/docs/api",
    badge: "Reference",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
];

const DocsIndex = () => {
  useTitle("Documentation — SeaPortal");
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center">
          <FaBook className="text-white dark:text-gray-900 text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Documentation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pilih panduan yang ingin kamu baca</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 mt-4">
        SeaPortal menyediakan dokumentasi untuk pengguna, integrator, dan developer. Pilih salah satu kategori di bawah untuk memulai.
      </p>

      {/* Cards */}
      <div className="space-y-3">
        {CARDS.map(({ icon: Icon, iconBg, label, desc, to, badge, badgeColor }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all text-left group"
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className="text-white text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
            <FaArrowRight className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0 text-sm" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default DocsIndex;
