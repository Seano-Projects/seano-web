import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaThermometerHalf, FaTint, FaWater, FaBolt, FaVolumeUp, FaTimes,
} from "react-icons/fa";
import ctdImage from "../../../../assets/sensor/ctd-midas-3000.webp";

const METRICS = [
  { icon: <FaThermometerHalf />, color: "text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", label: "Temperature",   unit: "°C",    desc: "Suhu air di setiap kedalaman" },
  { icon: <FaTint />,            color: "text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20",     label: "Salinity",      unit: "PSU",   desc: "Kadar garam terlarut dalam air" },
  { icon: <FaWater />,           color: "text-cyan-400",   bg: "bg-cyan-50 dark:bg-cyan-900/20",     label: "Density",       unit: "kg/m³", desc: "Massa jenis air laut" },
  { icon: <FaBolt />,            color: "text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", label: "Conductivity",  unit: "mS/cm", desc: "Kemampuan air menghantarkan listrik" },
  { icon: <FaVolumeUp />,        color: "text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", label: "Sound Velocity",unit: "m/s",   desc: "Kecepatan rambat suara di air" },
];

const PHENOMENA = [
  { name: "Thermocline", desc: "Lapisan di mana suhu turun drastis seiring kedalaman. Umumnya terjadi pada 50–200 m." },
  { name: "Halocline",   desc: "Lapisan transisi salinitas yang tajam, sering terjadi di muara sungai atau area pencampuran." },
  { name: "Pycnocline",  desc: "Lapisan perubahan densitas massa air, dipengaruhi oleh suhu dan salinitas sekaligus." },
];

const Panel = ({ onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && handleClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-start justify-end">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      <div className={`relative top-12 h-[calc(100vh-3rem-2.25rem)] w-full max-w-xl bg-white dark:bg-black shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">CTD Monitoring</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Panduan sensor & parameter oseanografi</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-800 transition-all"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">

          {/* Apa itu CTD */}
          <section>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Apa itu CTD?</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <strong className="text-gray-900 dark:text-white">CTD</strong> adalah instrumen oseanografi yang mengukur{" "}
              <span className="font-semibold text-blue-500">Conductivity</span>,{" "}
              <span className="font-semibold text-orange-500">Temperature</span>, dan{" "}
              <span className="font-semibold text-cyan-500">Depth</span>{" "}
              secara bersamaan saat diturunkan melalui kolom air. Data yang dihasilkan berupa{" "}
              <em>profil vertikal</em> — nilai setiap parameter di berbagai kedalaman — yang digunakan
              untuk memahami struktur termal, salinitas, dan densitas massa air laut.
            </p>
          </section>

          {/* Sensor */}
          <section>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Sensor yang Didukung</p>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="w-full">
                <img src={ctdImage} alt="CTD Midas 3000" className="w-full h-52 object-cover" />
              </div>
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                <p className="font-bold text-gray-900 dark:text-white text-base">Valeport MIDAS CTD+</p>
                <p className="text-xs text-blue-500 font-semibold mt-1">Model: Midas 3000</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-3">
                  CTD underwater profiler dari Valeport dengan akurasi tinggi, cocok untuk survei
                  oseanografi dan pemantauan lingkungan laut. Terintegrasi dengan platform SEANO
                  melalui protokol MQTT secara real-time.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {["Real-time MQTT", "Profil Vertikal", "Multi-parameter", "High Accuracy"].map((tag) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Parameter */}
          <section>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Parameter yang Diukur</p>
            <div className="space-y-2">
              {METRICS.map(({ icon, color, bg, label, unit, desc }) => (
                <div key={label} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 ${bg}`}>
                  <span className={`shrink-0 text-lg ${color}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <span className="shrink-0 text-xs font-mono font-bold text-gray-400 dark:text-gray-500">{unit}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Fenomena */}
          <section>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Fenomena Oseanografi</p>
            <div className="space-y-3">
              {PHENOMENA.map(({ name, desc }) => (
                <div key={name} className="border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 bg-white dark:bg-black">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>,
    document.body,
  );
};

const CTDInfoPanel = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-6 h-6 rounded-full border-2 border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 dark:border-gray-600 dark:text-gray-500 dark:hover:border-gray-400 dark:hover:text-gray-300 transition-all duration-200 flex items-center justify-center text-xs font-bold shrink-0"
        title="Info CTD"
      >
        ?
      </button>
      {open && <Panel onClose={() => setOpen(false)} />}
    </>
  );
};

export default CTDInfoPanel;
