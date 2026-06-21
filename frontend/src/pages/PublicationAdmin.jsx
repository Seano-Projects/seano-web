import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FaPlus, FaEdit, FaTrash, FaFilePdf, FaUpload, FaLink, FaTimes, FaExternalLinkAlt, FaBookOpen, FaEye, FaSearch } from 'react-icons/fa'
import { Modal, toast, Title } from '../components/ui'
import { Dropdown } from '../components/Widgets'
import DeleteConfirmModal from '../components/Widgets/DeleteConfirmModal'
import usePublicationData from '../hooks/usePublicationData'
import { useTranslation } from '../hooks/useTranslation'
import { API_BASE_URL } from '../config'

const TYPE_ITEMS = [
  'Conference Paper', 'Journal Article', 'Technical Report', 'KTI / Tugas Akhir', 'Laporan Penelitian'
].map(t => ({ id: t, name: t }))

const emptyForm = {
  title: '', authors: '', type: 'Journal Article',
  venue: '', year: '', abstract: '', doi: '', pdf: '', tags: '',
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

// ─── PDF Section ─────────────────────────────────────────────────────────────
const PDFField = ({ pdfUrl, onChange, onUpload, uploading, t }) => {
  const [mode, setMode] = useState(pdfUrl?.startsWith('/uploads/') ? 'uploaded' : pdfUrl ? 'url' : 'upload')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error(t('publications.form.pdfOnly'), { title: t('publications.form.formatError') })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t('publications.form.pdfMaxSize'), { title: t('publications.form.sizeError') })
      return
    }
    try {
      const res = await onUpload(file)
      if (res.success) {
        onChange(res.url)
        setMode('uploaded')
      } else {
        toast.error(res.message, { title: t('publications.form.uploadError') })
      }
    } catch {
      toast.error(t('publications.form.uploadGenericError'), { title: t('publications.form.uploadError') })
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const clearPDF = () => {
    onChange('')
    setMode('upload')
    if (fileRef.current) fileRef.current.value = ''
  }

  if (mode === 'uploaded' && pdfUrl) {
    const filename = pdfUrl.split('/').pop()
    const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE_URL}${pdfUrl}`
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/60 rounded-xl">
        <div className="relative shrink-0 w-12 h-16 rounded-md overflow-hidden border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-900 shadow-sm">
          <iframe
            src={`${fullUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title="PDF Preview"
            scrolling="no"
            style={{
              width: '820px',
              height: '1130px',
              transform: 'scale(0.075)',
              transformOrigin: 'top left',
              pointerEvents: 'none',
              border: 'none',
              overflow: 'hidden',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <FaFilePdf className="text-red-500 w-3.5 h-3.5 shrink-0" />
            <span className="text-sm font-medium text-gray-800 dark:text-white truncate">{filename}</span>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('publications.form.pdfUploaded')}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-fourth transition-colors rounded-lg hover:bg-fourth/10"
            title={t('publications.openPdf')}
          >
            <FaEye className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={clearPDF}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
            title={t('common.delete')}
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-1 bg-white/5 dark:bg-white/5 rounded-lg w-fit">
        <button type="button" onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'upload' ? 'bg-fourth text-white' : 'text-gray-400 hover:text-white'}`}>
          <FaUpload className="w-3 h-3" /> {t('publications.form.uploadPdf')}
        </button>
        <button type="button" onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'url' ? 'bg-fourth text-white' : 'text-gray-400 hover:text-white'}`}>
          <FaLink className="w-3 h-3" /> {t('publications.form.externalUrl')}
        </button>
      </div>
      {mode === 'upload' ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragOver ? 'border-fourth bg-fourth/10' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-black/5 dark:hover:bg-white/5'} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-fourth border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">{t('publications.form.uploading')}</span>
            </>
          ) : (
            <>
              <FaFilePdf className="w-7 h-7 text-red-400/60" />
              <div className="text-center">
                <p className="text-sm text-gray-700 dark:text-white font-medium">{t('publications.form.dragDrop')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('publications.form.pdfHint')}</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <input className={inputCls} placeholder={t('publications.form.urlPlaceholder')} value={pdfUrl} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────
const PublicationForm = ({ initial = emptyForm, onSubmit, onClose, loading, onUpload, t }) => {
  const [form, setForm] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (file) => {
    setUploading(true)
    try {
      const res = await onUpload(file)
      if (res.success) set('pdf', res.url)
      return res
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const tags = form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
    onSubmit({ ...form, tags })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 items-stretch">
        <div className="flex flex-col gap-4">
          <FormField label={t('publications.form.type')} required>
            <Dropdown
              items={TYPE_ITEMS}
              selectedItem={form.type}
              onItemChange={(item) => set('type', item.id)}
              getItemKey={(item) => item.id}
            />
          </FormField>
          <FormField label={t('publications.form.year')}>
            <input className={inputCls} placeholder="2025" value={form.year} onChange={e => set('year', e.target.value)} />
          </FormField>
          <FormField label={t('publications.form.title')} required>
            <input className={inputCls} placeholder={t('publications.form.titlePlaceholder')} value={form.title} onChange={e => set('title', e.target.value)} required />
          </FormField>
          <FormField label={t('publications.form.authors')} required>
            <input className={inputCls} placeholder={t('publications.form.authorsPlaceholder')} value={form.authors} onChange={e => set('authors', e.target.value)} required />
          </FormField>
          <FormField label={t('publications.form.venue')}>
            <input className={inputCls} placeholder={t('publications.form.venuePlaceholder')} value={form.venue} onChange={e => set('venue', e.target.value)} />
          </FormField>
          <FormField label={t('publications.form.doi')}>
            <input className={inputCls} placeholder={t('publications.form.doiPlaceholder')} value={form.doi} onChange={e => set('doi', e.target.value)} />
          </FormField>
          <FormField label={t('publications.form.tags')}>
            <input className={inputCls} placeholder={t('publications.form.tagsPlaceholder')} value={form.tags} onChange={e => set('tags', e.target.value)} />
          </FormField>
        </div>

        <div className="flex flex-col gap-4">
          <FormField label={t('publications.form.pdf')}>
            <PDFField pdfUrl={form.pdf} onChange={v => set('pdf', v)} onUpload={handleUpload} uploading={uploading} t={t} />
          </FormField>
          <div className="flex flex-col gap-1 flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('publications.form.abstract')}</label>
            <textarea
              className={`${inputCls} resize-none flex-1 h-full`}
              style={{ minHeight: 0 }}
              placeholder={t('publications.form.abstractPlaceholder')}
              value={form.abstract}
              onChange={e => set('abstract', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-5 mt-1">
        <button type="button" onClick={onClose}
          className="flex-1 px-4 py-2.5 text-white bg-red-600 border border-red-500 rounded-xl hover:bg-red-700 transition-colors font-medium">
          {t('publications.form.cancel')}
        </button>
        <button type="submit" disabled={loading || uploading}
          className="flex-1 px-4 py-2.5 bg-fourth text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
          {loading ? t('publications.form.saving') : t('publications.form.save')}
        </button>
      </div>
    </form>
  )
}

// ─── Type colors / gradients ──────────────────────────────────────────────────
const typeColor = {
  'Conference Paper':   'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'Journal Article':    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'Technical Report':   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'KTI / Tugas Akhir':  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Laporan Penelitian': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

const typeBg = {
  'Conference Paper':   'from-sky-800 to-sky-950',
  'Journal Article':    'from-violet-800 to-violet-950',
  'Technical Report':   'from-emerald-800 to-emerald-950',
  'KTI / Tugas Akhir':  'from-amber-800 to-amber-950',
  'Laporan Penelitian': 'from-rose-800 to-rose-950',
}

// ─── Single publication card ──────────────────────────────────────────────────
const PubCard = ({ pub, onEdit, onDelete, t }) => {
  const pdfUrl = pub.pdf?.startsWith('/uploads/')
    ? `${API_BASE_URL}${pub.pdf}`
    : pub.pdf || null

  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/50 transition-all duration-300 hover:-translate-y-1">
      <div className="relative w-full aspect-3/4 overflow-hidden bg-slate-900">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={pub.title}
            loading="lazy"
            scrolling="no"
            className="h-full"
            style={{ border: 'none', pointerEvents: 'none', overflow: 'hidden', width: 'calc(100% + 20px)' }}
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center gap-3 bg-linear-to-b ${typeBg[pub.type] ?? 'from-slate-700 to-slate-900'}`}>
            <FaFilePdf className="w-10 h-10 text-white/30" />
            <span className="text-[11px] text-white/40 text-center px-4">{pub.type}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4">
          <Link
            to={`/publications/${pub.id}`}
            className="w-full py-2.5 bg-fourth text-white rounded-xl text-sm font-semibold text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <FaEye size={13} /> {t('publications.viewDetail')}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(pub) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
            >
              <FaEdit size={12} /> {t('publications.edit')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(pub) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
            >
              <FaTrash size={12} /> {t('publications.delete').replace('?', '')}
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${typeColor[pub.type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
          {pub.type}
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{pub.title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pub.authors}</p>
        {pub.year && <span className="text-xs text-gray-400">{pub.year}</span>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PublicationAdmin() {
  const { t } = useTranslation()
  const { publications, loading, actions } = usePublicationData()
  const [showCreate, setShowCreate]   = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [deleteItem, setDeleteItem]   = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const [search, setSearch]           = useState('')

  const originalPdfRef = useRef('')
  const pendingPdfRef  = useRef('')

  const cleanupPendingPdf = useCallback(() => {
    const pending  = pendingPdfRef.current
    const original = originalPdfRef.current
    if (pending && pending !== original && pending.startsWith('/uploads/')) {
      actions.deletePDF(pending.split('/').pop())
    }
    pendingPdfRef.current = ''
  }, [actions])

  const trackPdfUpload = useCallback((url) => {
    if (url?.startsWith('/uploads/')) pendingPdfRef.current = url
  }, [])

  const openCreate = () => {
    originalPdfRef.current = ''
    pendingPdfRef.current  = ''
    setShowCreate(true)
  }

  const cancelCreate = () => {
    cleanupPendingPdf()
    setShowCreate(false)
  }

  const openEdit = (p) => {
    originalPdfRef.current = p.pdf || ''
    pendingPdfRef.current  = ''
    setEditItem({ ...p, tags: p.tags?.join(', ') || '' })
  }

  const cancelEdit = () => {
    cleanupPendingPdf()
    setEditItem(null)
  }

  const handleCreate = async (payload) => {
    setSubmitting(true)
    const res = await actions.addPublication(payload)
    setSubmitting(false)
    if (res.success) {
      pendingPdfRef.current = ''
      setShowCreate(false)
      toast.success(t('publications.toast.added'), { title: t('publications.toast.success') })
    } else {
      toast.error(res.message, { title: t('publications.toast.failed') })
    }
  }

  const handleEdit = async (payload) => {
    setSubmitting(true)
    const res = await actions.updatePublication(editItem.id, payload)
    setSubmitting(false)
    if (res.success) {
      const oldPdf = originalPdfRef.current
      const newPdf = payload.pdf
      if (oldPdf && oldPdf !== newPdf && oldPdf.startsWith('/uploads/')) {
        actions.deletePDF(oldPdf.split('/').pop())
      }
      pendingPdfRef.current = ''
      setEditItem(null)
      toast.success(t('publications.toast.updated'), { title: t('publications.toast.success') })
    } else {
      toast.error(res.message, { title: t('publications.toast.failed') })
    }
  }

  const handleDelete = async () => {
    const target = deleteItem
    setSubmitting(true)
    const res = await actions.deletePublication(target.id)
    setSubmitting(false)
    if (res.success) {
      if (target.pdf?.startsWith('/uploads/')) actions.deletePDF(target.pdf.split('/').pop())
      setDeleteItem(null)
      toast.success(t('publications.toast.deleted'), { title: t('publications.toast.success') })
    } else {
      toast.error(res.message, { title: t('publications.toast.failed') })
    }
  }

  const filtered = publications.filter(p =>
    !search ||
    [p.title, p.authors, p.venue, p.type].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <Title title={t('publications.title')} subtitle={t('publications.subtitle')} />
        <button
          onClick={openCreate}
          className="font-semibold flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-blue-700 transition duration-300 cursor-pointer hover:shadow-lg hover:shadow-fourth/50 bg-fourth"
        >
          <FaPlus size={16} />
          {t('publications.add')}
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
        <input
          type="text"
          placeholder={t('publications.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-fourth focus:border-transparent transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-fourth border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FaBookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {search ? t('publications.emptySearch') : t('publications.emptyState')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(pub => (
            <PubCard
              key={pub.id}
              pub={pub}
              onEdit={openEdit}
              onDelete={p => setDeleteItem(p)}
              t={t}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={cancelCreate} title={t('publications.add')} size="xl">
        <PublicationForm onSubmit={handleCreate} onClose={cancelCreate} loading={submitting} t={t}
          onUpload={async (f) => { const r = await actions.uploadPDF(f); if (r.success) trackPdfUpload(r.url); return r }} />
      </Modal>

      <Modal isOpen={!!editItem} onClose={cancelEdit} title={t('publications.edit')} size="xl">
        <PublicationForm initial={editItem ?? emptyForm} onSubmit={handleEdit} onClose={cancelEdit} loading={submitting} t={t}
          onUpload={async (f) => { const r = await actions.uploadPDF(f); if (r.success) trackPdfUpload(r.url); return r }} />
      </Modal>

      <DeleteConfirmModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title={t('publications.delete')}
        message={`"${deleteItem?.title}" ${t('publications.deleteMessage')}`}
      />
    </div>
  )
}
