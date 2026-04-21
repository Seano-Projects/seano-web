import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMapMarkedAlt,
  FaChevronLeft,
  FaArrowRight,
  FaHome,
  FaPlus,
  FaFolderOpen,
  FaDrawPolygon,
  FaRoute,
  FaSave,
  FaUpload,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { MdTimeline } from "react-icons/md";
import useTitle from "../../hooks/useTitle";

const Step = ({ num, title, desc, note }) => (
  <div className="flex gap-3">
    <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
      {num}
    </div>
    <div>
      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      {note && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">{note}</p>
      )}
    </div>
  </div>
);

const Section = ({ icon: Icon, color, iconBg, title, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
        <Icon className="text-white text-xs" />
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
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

const MissionPlannerDocs = () => {
  useTitle("Mission Planner — SeaPortal Docs");
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
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
          <FaMapMarkedAlt className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mission Planner</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cara membuat, mengelola, dan mengupload misi ke kendaraan</p>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-8 text-sm text-orange-700 dark:text-orange-300">
        Mission Planner memungkinkan kamu merencanakan rute kendaraan di peta — baik jalur bebas (<strong>Path</strong>) maupun pola survei area (<strong>Area/Zone</strong>) — lalu menguploadnya langsung ke kendaraan via MQTT.
      </div>

      {/* 1. Membuat Misi Baru */}
      <Section icon={FaPlus} iconBg="bg-orange-500" color="text-orange-500" title="1. Membuat Misi Baru">
        <Step num={1} title="Pilih kendaraan" desc='Gunakan dropdown "Select Vehicle" di sidebar kiri untuk memilih kendaraan yang akan menjalankan misi.' />
        <Step num={2} title="Klik + New Mission" desc='Klik tombol "+ New Mission" lalu isi nama dan deskripsi misi pada modal yang muncul.' />
        <Step num={3} title="Set Home Location" desc='Klik ikon rumah (🏠) di toolbar peta, lalu klik titik di peta sebagai posisi awal / titik pulang kendaraan.' note='Home Location wajib diset sebelum bisa upload misi.' />
      </Section>

      {/* 2. Load Misi yang Ada */}
      <Section icon={FaFolderOpen} iconBg="bg-blue-500" color="text-blue-500" title="2. Memuat Misi yang Sudah Ada">
        <Step num={1} title='Klik "Load"' desc='Di sebelah tombol "+ New Mission", klik "Load" untuk membuka daftar misi yang pernah disimpan.' />
        <Step num={2} title="Pilih misi" desc="Pilih misi dari daftar. Waypoint dan konfigurasi akan dimuat otomatis ke peta." />
        <Callout color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Misi yang dimuat bisa diedit ulang — tambah waypoint, ubah posisi, atau generate ulang coverage area.
        </Callout>
      </Section>

      {/* 3. Mode Path */}
      <Section icon={MdTimeline} iconBg="bg-teal-500" color="text-teal-500" title="3. Mode Path — Jalur Waypoint Bebas">
        <p className="text-xs text-gray-500 dark:text-gray-400">Gunakan mode ini untuk mendefinisikan rute kendaraan secara manual, titik per titik.</p>
        <Step num={1} title='Pilih mode "Path"' desc='Di bagian atas sidebar, pilih tab "Path".' />
        <Step num={2} title="Gambar jalur di peta" desc="Klik toolbar gambar polyline di peta (ikon garis), lalu klik beberapa titik di peta untuk membentuk jalur. Double-klik untuk mengakhiri." />
        <Step num={3} title="Waypoint otomatis terbuat" desc="Setiap titik yang diklik akan menjadi waypoint bernomor urut. Waypoint tampil di sidebar dengan koordinat lat/lon." />
        <Step num={4} title="Edit waypoint" desc='Klik ikon edit (✏️) pada waypoint di sidebar untuk mengubah koordinat secara manual, atau drag marker di peta.' />
        <Step num={5} title="Hapus waypoint" desc="Klik ikon hapus (🗑) pada waypoint untuk menghapus satu titik." />
        <Callout color="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          Mode Path cocok untuk rute inspeksi tertentu, patroli garis pantai, atau jalur yang sudah diketahui.
        </Callout>
      </Section>

      {/* 4. Mode Area */}
      <Section icon={FaDrawPolygon} iconBg="bg-purple-500" color="text-purple-500" title="4. Mode Area — Coverage Survey Otomatis">
        <p className="text-xs text-gray-500 dark:text-gray-400">Gunakan mode ini untuk survei area — sistem akan generate pola lawnmower (bolak-balik) secara otomatis dalam zona yang kamu gambar.</p>
        <Step num={1} title='Pilih mode "Area"' desc='Di bagian atas sidebar, pilih tab "Area".' />
        <Step num={2} title="Gambar zona di peta" desc="Klik toolbar gambar polygon di peta (ikon segitiga/polygon), lalu klik beberapa titik membentuk area. Double-klik atau klik titik awal untuk menutup polygon." />
        <Step num={3} title='Klik "Generate Waypoints"' desc='Setelah zona digambar, klik tombol "Generate Waypoints" di sidebar. Sistem akan otomatis menghasilkan jalur survei zigzag di dalam zona.' />
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs space-y-1">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Algoritma coverage:</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-400">
            <li>Pola <strong>lawnmower</strong> (bolak-balik horizontal)</li>
            <li>Spasi antar jalur diadaptasi otomatis berdasarkan luas area</li>
            <li>Area kecil → spasi lebih rapat, area besar → spasi lebih lebar</li>
            <li>Waypoint mencakup seluruh interior polygon</li>
          </ul>
        </div>
        <Step num={4} title="Review waypoint" desc="Hasil generate tampil di peta sebagai titik-titik berwarna dan di sidebar sebagai daftar. Kamu bisa hapus titik yang tidak diinginkan." />
        <Callout color="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          Mode Area cocok untuk pemetaan bathimetri, survei ekosistem, atau inspeksi area tertentu.
        </Callout>
      </Section>

      {/* 5. Simpan Misi */}
      <Section icon={FaSave} iconBg="bg-gray-600" color="text-gray-500" title="5. Menyimpan Misi">
        <Step num={1} title='Klik "Save Mission"' desc='Setelah waypoint siap, klik tombol "Save Mission" di bagian bawah sidebar.' />
        <Step num={2} title="Misi tersimpan di server" desc="Misi dan seluruh waypointnya disimpan ke database. Kamu bisa load kembali kapan saja." />
        <Callout color="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          Simpan misi dulu sebelum upload ke kendaraan untuk memastikan data tidak hilang.
        </Callout>
      </Section>

      {/* 6. Upload ke Kendaraan */}
      <Section icon={FaUpload} iconBg="bg-green-500" color="text-green-500" title="6. Upload Misi ke Kendaraan">
        <Step num={1} title='Klik "Upload to Vehicle"' desc='Klik tombol "Upload to Vehicle" di bagian bawah sidebar.' />
        <Step num={2} title="Pilih kendaraan tujuan" desc="Modal konfirmasi akan muncul. Pilih atau konfirmasi kendaraan yang akan menerima misi." />
        <Step num={3} title="Misi dikirim via MQTT" desc={`Sistem publish waypoint ke topik MQTT: seano/{vehicle_code}/mission. Kendaraan akan menerima dan memuat waypoint.`} />
        <Step num={4} title="Status upload" desc="Indikator upload akan tampil. Jika berhasil, status misi berubah dan kendaraan siap menjalankan misi." />
        <Callout color="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          Kendaraan harus dalam kondisi <strong>online</strong> dan <strong>terhubung</strong> ke broker MQTT agar upload berhasil.
        </Callout>
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
          onClick={() => navigate("/docs/control")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Control Guide <FaArrowRight className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default MissionPlannerDocs;
