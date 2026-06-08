import { useState, useRef } from 'react'
import { FaPlus, FaEdit, FaTrash, FaUpload, FaTimes, FaSearch, FaLinkedin, FaGithub, FaTwitter, FaInstagram, FaUser } from 'react-icons/fa'
import { Modal, toast, Title } from '../components/ui'
import { Dropdown } from '../components/Widgets'
import DeleteConfirmModal from '../components/Widgets/DeleteConfirmModal'
import useTeamData from '../hooks/useTeamData'
import { API_BASE_URL } from '../config'

const DIVISIONS = ['Dosen Pembimbing', 'Software & Kontrol', 'Hardware & Mekanik', 'Sensor & Akuisisi', 'Riset & Dokumentasi']
  .map(d => ({ id: d, name: d }))

const emptyForm = {
  name: '', role: '', division: '', photo: '',
  linkedin: '', github: '', twitter: '', instagram: '', sort_order: 0,
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent transition-colors'

const FormField = ({ label, required, children }) => (
  <div className="flex flex-col gap-1">
    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    {children}
  </div>
)

// ─── Photo Upload Field ────────────────────────────────────────────────────────
const PhotoField = ({ photoUrl, onChange, onUpload }) => {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Hanya JPG, PNG, atau WebP yang diizinkan', { title: 'Format salah' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB', { title: 'File terlalu besar' })
      return
    }
    setUploading(true)
    try {
      const res = await onUpload(file)
      if (res.success) onChange(res.url)
      else toast.error(res.message, { title: 'Upload gagal' })
    } finally {
      setUploading(false)
    }
  }

  const fullUrl = photoUrl
    ? (photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`)
    : null

  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
        {fullUrl
          ? <img src={fullUrl} alt="preview" className="w-full h-full object-cover" />
          : <FaUser className="w-8 h-8 text-gray-400" />
        }
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-slate-500 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-fourth hover:text-fourth transition-colors disabled:opacity-50">
          {uploading
            ? <><span className="w-3.5 h-3.5 border-2 border-fourth border-t-transparent rounded-full animate-spin" />Mengupload...</>
            : <><FaUpload className="w-3.5 h-3.5" />Upload Foto</>
          }
        </button>
        {photoUrl && (
          <button type="button" onClick={() => onChange('')}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors w-fit">
            <FaTimes className="w-3 h-3" /> Hapus foto
          </button>
        )}
        <p className="text-xs text-gray-400">JPG, PNG, WebP — maks 5MB</p>
      </div>
    </div>
  )
}

// ─── Member Form ───────────────────────────────────────────────────────────────
const MemberForm = ({ form, onChange, onSubmit, onCancel, onUpload, isEdit }) => (
  <form onSubmit={onSubmit}>
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <div className="flex flex-col gap-4">
        <FormField label="Foto Profil">
          <PhotoField photoUrl={form.photo} onChange={v => onChange('photo', v)} onUpload={onUpload} />
        </FormField>
        <FormField label="Divisi">
          <Dropdown
            items={DIVISIONS}
            selectedItem={form.division}
            onItemChange={(item) => onChange('division', item.id)}
            getItemKey={(item) => item.id}
            placeholder="-- Pilih Divisi --"
          />
        </FormField>
        <FormField label="Nama" required>
          <input className={inputCls} value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="Ali Musthofa Baharudin" />
        </FormField>
        <FormField label="Jabatan / Role" required>
          <input className={inputCls} value={form.role} onChange={e => onChange('role', e.target.value)} placeholder="Lead Developer — GCS & Web" />
        </FormField>
        <FormField label="Urutan Tampil">
          <input type="number" className={inputCls} value={form.sort_order}
            onChange={e => onChange('sort_order', parseInt(e.target.value) || 0)} min={0} />
        </FormField>
      </div>
      <div className="flex flex-col gap-4">
        <FormField label="LinkedIn URL">
          <div className="relative">
            <FaLinkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className={`${inputCls} pl-9`} value={form.linkedin} onChange={e => onChange('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
        </FormField>
        <FormField label="GitHub URL">
          <div className="relative">
            <FaGithub className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className={`${inputCls} pl-9`} value={form.github} onChange={e => onChange('github', e.target.value)} placeholder="https://github.com/..." />
          </div>
        </FormField>
        <FormField label="Twitter / X URL">
          <div className="relative">
            <FaTwitter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className={`${inputCls} pl-9`} value={form.twitter} onChange={e => onChange('twitter', e.target.value)} placeholder="https://twitter.com/..." />
          </div>
        </FormField>
        <FormField label="Instagram URL">
          <div className="relative">
            <FaInstagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className={`${inputCls} pl-9`} value={form.instagram} onChange={e => onChange('instagram', e.target.value)} placeholder="https://instagram.com/..." />
          </div>
        </FormField>
      </div>
    </div>
    <div className="flex gap-3 pt-5 mt-1">
      <button type="button" onClick={onCancel}
        className="flex-1 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium">
        Batal
      </button>
      <button type="submit"
        className="flex-1 py-2.5 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold">
        {isEdit ? 'Simpan Perubahan' : 'Tambah Anggota'}
      </button>
    </div>
  </form>
)

// ─── Member Card (admin view) ──────────────────────────────────────────────────
const divisionColor = {
  'Dosen Pembimbing':    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Software & Kontrol':  'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  'Hardware & Mekanik':  'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'Sensor & Akuisisi':   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Riset & Dokumentasi': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}
const avatarGrads = [
  'from-sky-500 to-blue-700', 'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700', 'from-cyan-500 to-blue-600',
]

const MemberCard = ({ member, index, onEdit, onDelete }) => {
  const photoUrl = member.photo
    ? (member.photo.startsWith('http') ? member.photo : `${API_BASE_URL}${member.photo}`)
    : null
  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40 transition-all duration-300 hover:-translate-y-1">
      <div className="relative w-full aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900">
        {photoUrl
          ? <img src={photoUrl} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
          : (
            <div className={`w-full h-full flex items-center justify-center bg-linear-to-br ${avatarGrads[index % avatarGrads.length]}`}>
              <span className="text-4xl font-bold text-white/80">
                {member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )
        }
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
          <button onClick={() => onEdit(member)} className="p-2.5 bg-white/20 hover:bg-fourth backdrop-blur-sm text-white rounded-xl transition-colors">
            <FaEdit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(member)} className="p-2.5 bg-white/20 hover:bg-red-500 backdrop-blur-sm text-white rounded-xl transition-colors">
            <FaTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        {member.division && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${divisionColor[member.division] ?? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}>
            {member.division}
          </span>
        )}
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-1">{member.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{member.role}</p>
        <div className="flex gap-1.5 pt-1">
          {member.linkedin && <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-sky-500 transition-colors"><FaLinkedin className="w-3.5 h-3.5" /></a>}
          {member.github && <a href={member.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><FaGithub className="w-3.5 h-3.5" /></a>}
          {member.twitter && <a href={member.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-sky-400 transition-colors"><FaTwitter className="w-3.5 h-3.5" /></a>}
          {member.instagram && <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors"><FaInstagram className="w-3.5 h-3.5" /></a>}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamAdmin() {
  const { members, loading, addMember, updateMember, deleteMember, uploadPhoto, deletePhoto } = useTeamData()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editTarget, setEditTarget] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Track uploaded-but-not-yet-saved photo so we can clean it up on cancel
  const originalPhotoRef = useRef('')   // photo URL before editing started
  const pendingPhotoRef = useRef('')    // URL of a freshly uploaded photo in this session

  const setField = (k, v) => {
    if (k === 'photo' && v?.startsWith('/uploads/')) {
      pendingPhotoRef.current = v
    }
    setForm(f => ({ ...f, [k]: v }))
  }

  // Delete pending upload if it differs from what was already saved
  const cleanupPending = () => {
    const pending = pendingPhotoRef.current
    const original = originalPhotoRef.current
    if (pending && pending !== original) {
      deletePhoto(pending)
    }
    pendingPhotoRef.current = ''
  }

  const filtered = members.filter(m =>
    [m.name, m.role, m.division].some(s => s?.toLowerCase().includes(search.toLowerCase()))
  )

  const openCreate = () => {
    originalPhotoRef.current = ''
    pendingPhotoRef.current = ''
    setForm(emptyForm)
    setShowCreate(true)
  }

  const cancelCreate = () => {
    cleanupPending()
    setShowCreate(false)
  }

  const openEdit = (m) => {
    originalPhotoRef.current = m.photo || ''
    pendingPhotoRef.current = ''
    setEditTarget(m)
    setForm({
      name: m.name, role: m.role, division: m.division || '',
      photo: m.photo || '', linkedin: m.linkedin || '',
      github: m.github || '', twitter: m.twitter || '',
      instagram: m.instagram || '', sort_order: m.sort_order || 0,
    })
    setShowEdit(true)
  }

  const cancelEdit = () => {
    cleanupPending()
    setShowEdit(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.role.trim()) {
      toast.error('Nama dan jabatan wajib diisi', { title: 'Validasi gagal' })
      return
    }
    const res = await addMember({ ...form, sort_order: Number(form.sort_order) })
    if (res.success) {
      pendingPhotoRef.current = '' // committed — don't clean up
      toast.success('Anggota berhasil ditambahkan')
      setShowCreate(false)
    } else {
      toast.error(res.message, { title: 'Gagal' })
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.role.trim()) {
      toast.error('Nama dan jabatan wajib diisi', { title: 'Validasi gagal' })
      return
    }
    const res = await updateMember(editTarget.id, { ...form, sort_order: Number(form.sort_order) })
    if (res.success) {
      // If the user replaced the photo, delete the old one from server
      const oldPhoto = originalPhotoRef.current
      const newPhoto = form.photo
      if (oldPhoto && oldPhoto !== newPhoto && oldPhoto.startsWith('/uploads/')) {
        deletePhoto(oldPhoto)
      }
      pendingPhotoRef.current = '' // committed
      toast.success('Anggota berhasil diperbarui')
      setShowEdit(false)
    } else {
      toast.error(res.message, { title: 'Gagal' })
    }
  }

  const handleDelete = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    const res = await deleteMember(target.id)
    if (res.success) {
      // Also remove the photo file from server
      if (target.photo) deletePhoto(target.photo)
      toast.success('Anggota berhasil dihapus')
    } else {
      toast.error(res.message, { title: 'Gagal hapus' })
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Title title="Anggota Tim" subtitle="Kelola anggota tim SEANO" />
        <button
          onClick={openCreate}
          className="font-semibold flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-blue-700 transition duration-300 cursor-pointer hover:shadow-lg hover:shadow-fourth/50 bg-fourth"
        >
          <FaPlus size={16} /> Tambah Anggota
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5 max-w-sm">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
        <input
          type="text"
          placeholder="Cari nama, jabatan, divisi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-fourth border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FaUser className="w-12 h-12 text-gray-300 dark:text-slate-600" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {search ? 'Tidak ada anggota yang sesuai pencarian' : 'Belum ada anggota tim'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((m, i) => (
            <MemberCard key={m.id} member={m} index={i} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={cancelCreate} title="Tambah Anggota Tim" size="xl">
        <MemberForm form={form} onChange={setField} onSubmit={handleCreate}
          onCancel={cancelCreate} onUpload={uploadPhoto} isEdit={false} />
      </Modal>

      <Modal isOpen={showEdit} onClose={cancelEdit} title="Edit Anggota Tim" size="xl">
        <MemberForm form={form} onChange={setField} onSubmit={handleUpdate}
          onCancel={cancelEdit} onUpload={uploadPhoto} isEdit={true} />
      </Modal>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={deleteTarget?.name}
      />
    </div>
  )
}
