import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaRocket,
  FaChevronLeft,
  FaArrowRight,
  FaGithub,
  FaShip,
  FaPlug,
  FaKey,
  FaWifi,
  FaCheckCircle,
  FaCopy,
  FaCheck,
  FaUserPlus,
  FaTerminal,
} from "react-icons/fa";
import useTitle from "../../hooks/useTitle";

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
      className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-400"
      title="Copy"
    >
      {copied ? (
        <FaCheck className="text-xs text-green-400" />
      ) : (
        <FaCopy className="text-xs" />
      )}
    </button>
  );
};

const CodeHighlight = ({ code, lang }) => {
  // YAML highlighter
  if (lang === "yaml") {
    const lines = code.split("\n");
    return (
      <>
        {lines.map((line, i) => {
          // comment
          if (/^\s*#/.test(line)) {
            return (
              <span key={i} className="text-[#6a9955]">
                {line}
                {"\n"}
              </span>
            );
          }
          // key: value
          const kvMatch = line.match(/^(\s*)([^:#\s][^:]*?)(\s*:\s*)(.*)$/);
          if (kvMatch) {
            const [, indent, key, colon, val] = kvMatch;
            const valColor =
              val.startsWith('"') || val.startsWith("'")
                ? "text-[#ce9178]"
                : /^(true|false|null)$/.test(val.trim())
                  ? "text-[#569cd6]"
                  : /^-?\d/.test(val.trim())
                    ? "text-[#b5cea8]"
                    : "text-[#d4d4d4]";
            const commentIdx = val.indexOf(" #");
            const actualVal = commentIdx > -1 ? val.slice(0, commentIdx) : val;
            const inlineComment = commentIdx > -1 ? val.slice(commentIdx) : "";
            return (
              <span key={i}>
                <span className="text-[#d4d4d4]">{indent}</span>
                <span className="text-[#9cdcfe]">{key}</span>
                <span className="text-[#d4d4d4]">{colon}</span>
                <span className={valColor}>{actualVal}</span>
                {inlineComment && (
                  <span className="text-[#6a9955]">{inlineComment}</span>
                )}
                {"\n"}
              </span>
            );
          }
          return (
            <span key={i} className="text-[#d4d4d4]">
              {line}
              {"\n"}
            </span>
          );
        })}
      </>
    );
  }

  // Bash / shell highlighter
  if (lang === "bash" || lang === "shell") {
    const lines = code.split("\n");
    return (
      <>
        {lines.map((line, i) => {
          if (/^\s*#/.test(line)) {
            return (
              <span key={i} className="text-[#6a9955]">
                {line}
                {"\n"}
              </span>
            );
          }
          const cmd = line.trim().split(/\s+/)[0];
          const rest = line.slice(line.indexOf(cmd) + cmd.length);
          const shellCmds = [
            "git",
            "cd",
            "pip",
            "npm",
            "python",
            "node",
            "cp",
            "chmod",
            "sudo",
            "apt",
            "brew",
            "curl",
            "echo",
            "export",
          ];
          if (shellCmds.includes(cmd)) {
            return (
              <span key={i}>
                <span className="text-[#569cd6]">{cmd}</span>
                <span className="text-[#d4d4d4]">{rest}</span>
                {"\n"}
              </span>
            );
          }
          return (
            <span key={i} className="text-[#d4d4d4]">
              {line}
              {"\n"}
            </span>
          );
        })}
      </>
    );
  }

  // Plain text fallback
  return <span className="text-[#d4d4d4]">{code}</span>;
};

const CodeBlock = ({ code, lang = "bash" }) => (
  <div className="relative bg-white dark:bg-black rounded-lg mt-2 overflow-x-auto custom-scrollbar">
    <pre className="text-xs font-mono px-4 py-3 leading-relaxed">
      <CodeHighlight code={code} lang={lang} />
    </pre>
    <CopyBtn text={code} />
  </div>
);

const Step = ({ num, title, desc, children }) => (
  <div className="flex gap-3">
    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
      {num}
    </div>
    <div className="flex-1">
      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
        {title}
      </p>
      {desc && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {desc}
        </p>
      )}
      {children}
    </div>
  </div>
);

const Section = ({ icon: Icon, iconBg, title, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-3">
      <div
        className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}
      >
        <Icon className="text-white text-xs" />
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

const GettingStarted = () => {
  useTitle("Getting Started — SeaPortal");
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
        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
          <FaRocket className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Getting Started
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setup USV dari awal hingga terhubung ke SeaPortal
          </p>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8 text-sm text-blue-700 dark:text-blue-300">
        Panduan ini menjelaskan cara menyiapkan USV dari awal — mulai dari clone
        firmware, registrasi akun dan kendaraan, konfigurasi MQTT, hingga
        kendaraan muncul online di dashboard.
      </div>

      {/* 1. Registrasi Akun */}
      <Section
        icon={FaUserPlus}
        iconBg="bg-blue-500"
        title="1. Registrasi Akun SeaPortal"
      >
        <Step
          num={1}
          title="Buka SeaPortal di browser"
          desc="Akses URL SeaPortal yang sudah dideploy (contoh: https://seano.cloud)."
        />
        <Step
          num={2}
          title="Daftar email"
          desc='Klik "Register" → masukkan email → klik "Send Verification".'
        />
        <Step
          num={3}
          title="Verifikasi email"
          desc="Cek inbox, klik link verifikasi. Kamu akan diarahkan ke halaman set password & username."
        />
        <Step
          num={4}
          title="Login"
          desc="Setelah set credentials, login dengan email dan password yang baru dibuat."
        />
      </Section>

      {/* 2. Daftarkan Kendaraan */}
      <Section
        icon={FaShip}
        iconBg="bg-teal-500"
        title="2. Daftarkan Kendaraan (Vehicle)"
      >
        <Step
          num={1}
          title="Buka menu Vehicle"
          desc='Di sidebar, klik "Vehicle" → klik tombol "+ Add Vehicle".'
        />
        <Step num={2} title="Isi data kendaraan">
          <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs space-y-1">
            <div className="flex gap-2">
              <span className="font-mono text-gray-700 dark:text-gray-300 w-24 shrink-0">
                Code
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Kode unik USV, contoh:{" "}
                <code className="font-mono text-blue-500">USV-001</code>. Ini
                dipakai sebagai MQTT topic prefix.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-gray-700 dark:text-gray-300 w-24 shrink-0">
                Name
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Nama deskriptif kendaraan.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-gray-700 dark:text-gray-300 w-24 shrink-0">
                Description
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Opsional — keterangan tambahan.
              </span>
            </div>
          </div>
        </Step>
        <Step
          num={3}
          title="Generate API Key"
          desc='Setelah kendaraan dibuat, buka detail kendaraan → klik "Generate API Key". Simpan API Key ini — akan dipakai di konfigurasi firmware USV.'
        />
        <Callout color="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
          Vehicle Code harus <strong>sama persis</strong> dengan yang
          dikonfigurasi di firmware USV. Ini dipakai sebagai bagian dari MQTT
          topic: <code className="font-mono">seano/{"{vehicle_code}"}/...</code>
        </Callout>
      </Section>

      {/* 3. Clone Firmware */}
      <Section
        icon={FaGithub}
        iconBg="bg-gray-800"
        title="3. Clone Firmware USV"
      >
        <Step
          num={1}
          title="Pastikan git sudah terinstall di komputer onboard USV"
          desc="Raspberry Pi, Jetson Nano, atau komputer onboard lainnya."
        />
        <Step num={2} title="Clone repository firmware">
          <CodeBlock
            lang="bash"
            code={`git clone https://github.com/seano-id/usv-firmware.git
cd usv-firmware`}
          />
        </Step>
        <Step num={3} title="Install dependencies">
          <CodeBlock
            lang="bash"
            code={`pip install -r requirements.txt
# atau jika menggunakan Node.js:
npm install`}
          />
        </Step>
        <Callout color="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          Repo firmware berisi kode untuk publish data telemetri, baterai,
          sensor, dan subscribe command dari SeaPortal via MQTT.
        </Callout>
      </Section>

      {/* 4. Konfigurasi Firmware */}
      <Section
        icon={FaTerminal}
        iconBg="bg-orange-500"
        title="4. Konfigurasi Firmware"
      >
        <Step num={1} title="Salin file konfigurasi contoh">
          <CodeBlock lang="bash" code={`cp config.example.yaml config.yaml`} />
        </Step>
        <Step num={2} title="Edit config.yaml — isi parameter berikut:">
          <CodeBlock
            lang="yaml"
            code={`mqtt:
  broker: "mqtt://your-seano-server:1883"
  username: ""         # kosongkan jika tidak ada auth
  password: ""

vehicle:
  code: "USV-001"      # harus sama dengan Vehicle Code di SeaPortal
  api_key: "your-api-key-from-seaportal"

seano:
  base_url: "https://seano.cloud/api"`}
          />
        </Step>
        <Callout color="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
          <strong>vehicle.code</strong> dan <strong>vehicle.api_key</strong>{" "}
          harus sesuai dengan yang ada di SeaPortal. API Key dipakai untuk HTTP
          endpoint seperti POST /vehicle-batteries dan POST /vehicle-logs.
        </Callout>
      </Section>

      {/* 5. Koneksi MQTT */}
      <Section
        icon={FaWifi}
        iconBg="bg-green-500"
        title="5. Setup Koneksi MQTT"
      >
        <Step
          num={1}
          title="Pastikan broker MQTT aktif"
          desc="SeaPortal menggunakan broker MQTT internal (biasanya port 1883). Pastikan firewall mengizinkan koneksi dari USV."
        />
        <Step
          num={2}
          title="Konfigurasi LWT (Last Will Testament)"
          desc="Firmware harus mengirim LWT ke topik status agar SeaPortal tahu saat USV offline."
        >
          <CodeBlock
            lang="shell"
            code={`LWT Topic:   seano/USV-001/status
LWT Payload: "offline"
Connect Msg: "online"
QoS: 1, Retain: true`}
          />
        </Step>
        <Step num={3} title="Jalankan firmware">
          <CodeBlock
            lang="bash"
            code={`python main.py
# atau:
npm start`}
          />
        </Step>
      </Section>

      {/* 6. Verifikasi */}
      <Section
        icon={FaCheckCircle}
        iconBg="bg-green-600"
        title="6. Verifikasi — Kendaraan Online"
      >
        <Step
          num={1}
          title="Buka SeaPortal Dashboard"
          desc="Setelah firmware berjalan dan terkoneksi ke MQTT broker, status kendaraan harus berubah menjadi Online."
        />
        <Step
          num={2}
          title="Cek halaman Tracking"
          desc="Posisi GPS kendaraan akan tampil di peta jika firmware mengirim data telemetri ke topik yang benar."
        />
        <Step
          num={3}
          title="Cek halaman Battery"
          desc="Data baterai tampil jika firmware publish ke seano/{vehicle_code}/battery."
        />
        <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            Checklist kendaraan online:
          </p>
          <ul className="space-y-1 text-gray-500 dark:text-gray-400">
            {[
              "Vehicle Code terdaftar di SeaPortal",
              "API Key sudah di-generate dan dikonfigurasi di firmware",
              "MQTT broker dapat diakses dari USV (cek port 1883)",
              "Firmware running dan publish ke topik seano/{code}/status",
              "Dashboard menampilkan status Online",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <FaCheckCircle className="text-green-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 7. Koneksi Sensor */}
      <Section
        icon={FaPlug}
        iconBg="bg-purple-500"
        title="7. Integrasi Sensor (Opsional)"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Jika USV dilengkapi sensor (CTD, ADCP, SBES, dll), daftarkan sensor di
          SeaPortal dan konfigurasi firmware untuk publish data sensor.
        </p>
        <Step
          num={1}
          title="Daftarkan tipe sensor"
          desc='Di SeaPortal: menu "Sensor Types" → tambah tipe sensor (contoh: CTD, ADCP).'
        />
        <Step
          num={2}
          title="Daftarkan sensor"
          desc='Menu "Sensors" → tambah sensor dengan kode unik (contoh: CTD-MIDAS-01).'
        />
        <Step
          num={3}
          title="Pasangkan sensor ke kendaraan"
          desc='Di detail kendaraan → tab "Sensors" → assign sensor.'
        />
        <Step num={4} title="Publish data sensor dari firmware">
          <CodeBlock
            code={`Topic: seano/USV-001/CTD-MIDAS-01/data
Payload:
{
  "vehicle_code": "USV-001",
  "sensor_type": "ctd",
  "timestamp": "2026-04-18T12:00:00Z",
  "values": { "temp": 28.4, "salinity": 34.1, "depth": 5.2 }
}`}
          />
        </Step>
      </Section>

      {/* Footer nav */}
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
          Mission Planner <FaArrowRight className="text-xs" />
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

export default GettingStarted;
