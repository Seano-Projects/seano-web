import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChevronLeft,
  FaArrowRight,
  FaLock,
  FaUnlock,
  FaShip,
  FaGamepad,
  FaExclamationTriangle,
} from "react-icons/fa";
import { MdSettingsRemote } from "react-icons/md";
import { TbAnchor } from "react-icons/tb";
import useTitle from "../../hooks/useTitle";

const Step = ({ num, title, desc, note, color = "bg-red-500" }) => (
  <div className="flex gap-3">
    <div
      className={`w-5 h-5 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}
    >
      {num}
    </div>
    <div>
      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
        {title}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      {note && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 italic">
          {note}
        </p>
      )}
    </div>
  </div>
);

const Section = ({ icon: Icon, iconBg, title, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-3">
      <div
        className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}
      >
        <Icon className="text-white text-sm" />
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
    </div>
    <div className="pl-9 space-y-3 text-sm text-gray-600 dark:text-gray-300">
      {children}
    </div>
  </div>
);

const Callout = ({ color, children }) => (
  <div className={`rounded-lg p-3 text-xs leading-relaxed ${color}`}>
    {children}
  </div>
);

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
      if (match[2]) {
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
      tokens.push(
        <span key={match.index} className="text-[#569cd6]">
          {match[3]}
        </span>,
      );
    } else if (match[4] !== undefined) {
      tokens.push(
        <span key={match.index} className="text-[#b5cea8]">
          {match[4]}
        </span>,
      );
    } else if (match[5] !== undefined) {
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

const ModeCard = ({ name, desc, color }) => (
  <div className="flex items-start gap-3 py-3">
    <span
      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 ${color}`}
    >
      {name}
    </span>
    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
  </div>
);

const ControlDocs = () => {
  useTitle("Control Guide — SeaPortal Docs");
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate("/docs")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors"
      >
        <FaChevronLeft className="text-xs" /> Documentation
      </button>

      {/* Hero */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
          <MdSettingsRemote className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Control Guide
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cara mengontrol kendaraan — arm, disarm, mode, dan thruster
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4 mb-8 flex gap-3">
        <FaExclamationTriangle className="text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Halaman Control memberikan akses langsung ke sistem propulsi
          kendaraan. Pastikan area sekitar kendaraan aman sebelum melakukan arm
          atau mengirim perintah gerak.
        </p>
      </div>

      {/* 1. Pilih Kendaraan */}
      <Section icon={FaShip} iconBg="bg-blue-500" title="1. Memilih Kendaraan">
        <Step
          num={1}
          title="Buka halaman Control"
          desc='Klik menu "Control" di sidebar navigasi.'
          color="bg-blue-500"
        />
        <Step
          num={2}
          title="Pilih kendaraan"
          desc="Gunakan dropdown kendaraan di panel kiri atas untuk memilih kendaraan yang ingin dikontrol."
          color="bg-blue-500"
        />
        <Step
          num={3}
          title="Verifikasi status"
          desc="Pastikan indikator status menunjukkan kendaraan Online sebelum mengirim perintah apapun."
          color="bg-blue-500"
        />
        <Callout color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Panel kiri menampilkan data realtime: koordinat GPS, heading,
          kecepatan, RSSI sinyal, dan suhu.
        </Callout>
      </Section>

      {/* 2. Arm */}
      <Section icon={FaLock} iconBg="bg-green-500" title="2. Arm Kendaraan">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Arm</strong> mengaktifkan sistem propulsi kendaraan. Kendaraan{" "}
          <em>tidak akan bergerak</em> saat di-arm kecuali ada perintah thruster
          atau mode AUTO aktif.
        </p>
        <Step
          num={1}
          title='Panel "MISSION CONTROL"'
          desc='Di panel kanan, lihat bagian "MISSION CONTROL". Status awal adalah "SYSTEM DISARMED".'
          color="bg-green-500"
        />
        <Step
          num={2}
          title='Klik "ARM SYSTEM"'
          desc='Klik tombol hijau "ARM SYSTEM".'
          color="bg-green-500"
        />
        <Step
          num={3}
          title="Slide to Confirm"
          desc="Muncul slider konfirmasi — geser ke kanan sampai ujung untuk mengkonfirmasi arm. Ini mencegah arm tidak sengaja."
          color="bg-green-500"
        />
        <Step
          num={4}
          title="Status berubah"
          desc='Panel menampilkan "SYSTEM ARMED" dengan indikator hijau. Kendaraan sekarang siap menerima perintah gerak.'
          color="bg-green-500"
        />
        <Callout color="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          Perintah ARM dikirim via MQTT ke topik{" "}
          <code className="font-mono">seano/{"{vehicle_code}"}/command</code>{" "}
          dengan payload{" "}
          <code className="font-mono">{`{"command":"ARM"}`}</code>
        </Callout>
      </Section>

      {/* 3. Disarm */}
      <Section icon={FaUnlock} iconBg="bg-gray-600" title="3. Disarm Kendaraan">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Disarm</strong> menonaktifkan sistem propulsi. Kendaraan tidak
          akan merespons perintah gerak setelah disarm.
        </p>
        <Step
          num={1}
          title='Klik "DISARM SYSTEM"'
          desc='Saat kendaraan dalam kondisi armed, tombol berubah menjadi "DISARM SYSTEM". Klik tombol tersebut.'
          color="bg-gray-500"
        />
        <Step
          num={2}
          title="Slide to Confirm"
          desc="Geser slider konfirmasi untuk memastikan disarm disengaja."
          color="bg-gray-500"
        />
        <Step
          num={3}
          title="Status kembali Disarmed"
          desc='Indikator kembali ke "SYSTEM DISARMED". Thruster nonaktif.'
          color="bg-gray-500"
        />
        <Callout color="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
          Selalu disarm kendaraan setelah selesai mengoperasikan atau saat
          kendaraan tidak diawasi.
        </Callout>
      </Section>

      {/* 4. Flight Mode */}
      <Section icon={TbAnchor} iconBg="bg-indigo-500" title="4. Mode Operasi">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Pilih mode operasi dengan mengklik salah satu mode di panel MISSION
          CONTROL. Mode aktif ditampilkan dengan highlight biru.
        </p>
        <div className="space-y-2">
          <ModeCard
            name="MANUAL"
            desc="Kontrol penuh oleh operator. Semua gerak kendaraan dikontrol via thruster joystick secara realtime."
            color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          />
          <ModeCard
            name="AUTO"
            desc="Kendaraan menjalankan waypoint misi secara otomatis. Operator tidak perlu mengontrol manual."
            color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          />
          <ModeCard
            name="HOLD"
            desc="Kendaraan mempertahankan posisi GPS saat ini. Cocok untuk pause sementara tanpa disarm."
            color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          />
          <ModeCard
            name="LOITER"
            desc="Station Keeping — kendaraan bergerak dalam radius kecil di sekitar posisi target."
            color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          />
          <ModeCard
            name="RTL"
            desc="Return To Launch — kendaraan otomatis kembali ke Home Location yang sudah ditentukan."
            color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          />
        </div>
        <Callout color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          Perubahan mode dikirim via MQTT:{" "}
          <code className="font-mono">{`{"command":"SET_MODE","params":{"mode":"GUIDED"}}`}</code>
        </Callout>
      </Section>

      {/* 5. Thruster Control */}
      <Section
        icon={FaGamepad}
        iconBg="bg-red-500"
        title="5. Kontrol Thruster (Manual Mode)"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Saat mode <strong>MANUAL</strong> aktif dan kendaraan sudah{" "}
          <strong>armed</strong>, kamu bisa mengontrol thruster via virtual
          joystick di layar.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs space-y-2">
          <p className="font-medium text-gray-700 dark:text-gray-300">
            Virtual Joystick:
          </p>
          <div className="space-y-1 text-gray-500 dark:text-gray-400">
            <div className="flex gap-2">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 rounded">
                ↑↓
              </span>
              <span>Throttle — maju/mundur (nilai -100 sampai +100)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 rounded">
                ←→
              </span>
              <span>Steering — belok kiri/kanan (nilai -100 sampai +100)</span>
            </div>
          </div>
        </div>
        <Step
          num={1}
          title="Pastikan kondisi"
          desc="Mode MANUAL aktif + kendaraan sudah ARMED. Joystick aktif hanya dalam kondisi ini."
          color="bg-red-500"
        />
        <Step
          num={2}
          title="Drag joystick"
          desc="Sentuh/klik dan drag lingkaran joystick ke arah yang diinginkan. Lepas untuk kembali ke tengah (stop)."
          color="bg-red-500"
        />
        <Step
          num={3}
          title="Data dikirim realtime"
          desc="Nilai throttle dan steering dikirim periodik via MQTT command. Kendaraan merespons gerakan."
          color="bg-red-500"
        />
        <div className="bg-white dark:bg-black rounded-lg p-3 text-xs overflow-x-auto custom-scrollbar">
          <pre className="font-mono">
            <JsonHighlight
              code={`{
  "command": "THRUSTER",
  "params": {
    "throttle": 45,
    "steering": -20
  }
}`}
            />
          </pre>
        </div>
        <Callout color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          Perintah thruster dikirim dengan rate terbatas (throttle). Jika
          koneksi putus, kendaraan akan berhenti setelah timeout.
        </Callout>
      </Section>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex gap-3 flex-wrap">
        <button
          onClick={() => navigate("/docs")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <FaChevronLeft className="text-xs" /> Dokumentasi
        </button>
        <button
          onClick={() => navigate("/docs/mission-planner")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <FaChevronLeft className="text-xs" /> Mission Planner
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

export default ControlDocs;
