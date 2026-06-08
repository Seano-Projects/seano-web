import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaSearch, FaTimes, FaFilePdf, FaArrowLeft, FaFilter, FaChevronDown } from 'react-icons/fa'
import { GoArrowUpRight } from 'react-icons/go'
import { API_ENDPOINTS, API_BASE_URL } from '../config'
import Navbar from '../components/Section/Landing/Layout/Navbar'

const TYPES = [
  'Conference Paper',
  'Journal Article',
  'Technical Report',
  'KTI / Tugas Akhir',
  'Laporan Penelitian',
]

const typeAccent = {
  'Conference Paper':   'text-sky-400 border-sky-400/30 bg-sky-400/10',
  'Journal Article':    'text-violet-400 border-violet-400/30 bg-violet-400/10',
  'Technical Report':   'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  'KTI / Tugas Akhir':  'text-amber-400 border-amber-400/30 bg-amber-400/10',
  'Laporan Penelitian': 'text-rose-400 border-rose-400/30 bg-rose-400/10',
}

const typeGradient = {
  'Conference Paper':   'from-sky-900/60 via-sky-800/30 to-transparent',
  'Journal Article':    'from-violet-900/60 via-violet-800/30 to-transparent',
  'Technical Report':   'from-emerald-900/60 via-emerald-800/30 to-transparent',
  'KTI / Tugas Akhir':  'from-amber-900/60 via-amber-800/30 to-transparent',
  'Laporan Penelitian': 'from-rose-900/60 via-rose-800/30 to-transparent',
}

const typeDot = {
  'Conference Paper':   'bg-sky-400',
  'Journal Article':    'bg-violet-400',
  'Technical Report':   'bg-emerald-400',
  'KTI / Tugas Akhir':  'bg-amber-400',
  'Laporan Penelitian': 'bg-rose-400',
}

const getPdfUrl = (pdf) =>
  pdf?.startsWith('/uploads/') ? `${API_BASE_URL}${pdf}` : pdf || null

const safeUrl = (url) => {
  if (!url) return null
  try {
    const u = new URL(url)
    return (u.protocol === 'https:' || u.protocol === 'http:') ? url : null
  } catch { return null }
}

// ─── Publication Card ─────────────────────────────────────────────────────────
const PubCard = ({ pub, index }) => {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      onClick={() => navigate(`/publication/${pub.id}`)}
      className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/6 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Top gradient header */}
      <div className={`relative h-28 bg-linear-to-b ${typeGradient[pub.type] ?? 'from-gray-800/60 via-gray-700/30 to-transparent'} flex flex-col justify-between p-4`}>
        <div
          className="absolute inset-0 opacity-6"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <span className={`relative self-start text-[10px] font-semibold px-2.5 py-1 rounded-full border ${typeAccent[pub.type] ?? 'text-gray-400 border-white/10 bg-white/5'}`}>
          {pub.type}
        </span>
        <div className="relative self-end opacity-0 group-hover:opacity-100 transition-opacity">
          <GoArrowUpRight className="text-white w-4 h-4" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-3">
          {pub.title}
        </h3>
        {pub.abstract && (
          <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2">
            {pub.abstract}
          </p>
        )}
        {pub.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pub.tags.slice(0, 3).map((tag, j) => (
              <span key={j} className="text-[10px] text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-white/5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeDot[pub.type] ?? 'bg-gray-400'}`} />
          <p className="text-gray-400 text-[11px] truncate flex-1">{pub.authors}</p>
          <span className="text-gray-600 text-[11px] shrink-0">{pub.year}</span>
        </div>

        <div className="flex gap-2">
          {pub.pdf && (
            <a
              href={getPdfUrl(pub.pdf)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-white bg-primary/20 hover:bg-primary/30 border border-primary/30 px-2.5 py-1 rounded-full transition-colors"
            >
              <FaFilePdf className="w-2.5 h-2.5" /> PDF
            </a>
          )}
          {safeUrl(pub.doi) && (
            <a
              href={safeUrl(pub.doi)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full transition-colors"
            >
              DOI <GoArrowUpRight className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Filter Checkbox ──────────────────────────────────────────────────────────
const FilterCheck = ({ label, checked, onChange, accent }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group py-1">
    <div
      onClick={onChange}
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'bg-primary border-primary' : 'border-white/20 group-hover:border-white/40'
      }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span className={`text-xs transition-colors ${checked ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} ${accent ?? ''}`}>
      {label}
    </span>
  </label>
)

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicationsPublicList() {
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedYears, setSelectedYears] = useState([])
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  useEffect(() => {
    fetch(API_ENDPOINTS.PUBLICATIONS.LIST)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setPublications(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const years = [...new Set(publications.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a)

  const toggleType = (t) =>
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const toggleYear = (y) =>
    setSelectedYears((prev) => prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y])

  const clearFilters = () => { setSelectedTypes([]); setSelectedYears([]); setSearch('') }

  const hasFilter = selectedTypes.length > 0 || selectedYears.length > 0 || search

  const filtered = publications.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !search || [p.title, p.authors, p.venue, p.type, ...(p.tags ?? [])].some((v) => v?.toLowerCase().includes(q))
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(p.type)
    const matchYear = selectedYears.length === 0 || selectedYears.includes(p.year)
    return matchSearch && matchType && matchYear
  })

  const filterPanel = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Filter</span>
        {hasFilter && (
          <button onClick={clearFilters} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors flex items-center gap-1">
            <FaTimes className="w-2.5 h-2.5" /> Reset
          </button>
        )}
      </div>
      <div className="mb-6">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Tipe</p>
        {TYPES.map((t) => (
          <FilterCheck key={t} label={t} checked={selectedTypes.includes(t)} onChange={() => toggleType(t)} />
        ))}
      </div>
      {years.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Tahun</p>
          {years.map((y) => (
            <FilterCheck key={y} label={y} checked={selectedYears.includes(y)} onChange={() => toggleYear(y)} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white font-openSans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16 sm:pb-20">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors mb-5 group">
            <FaArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" /> Kembali ke Beranda
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-0.5 bg-primary" />
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">Research & Publications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">All Publications</h1>
          <p className="text-gray-500 text-sm mt-2">
            Seluruh karya ilmiah, makalah, dan laporan teknis dari tim SEANO.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* ── Left: Filters — sticky on desktop, collapsible on mobile ── */}
          <aside className="w-full md:w-52 md:shrink-0 md:sticky md:top-28">
            {/* Mobile filter toggle */}
            <button
              className="md:hidden w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 text-sm text-gray-300 mb-2"
              onClick={() => setShowMobileFilter(v => !v)}
            >
              <span className="flex items-center gap-2">
                <FaFilter className="w-3 h-3 text-gray-500" />
                Filter
                {hasFilter && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">{selectedTypes.length + selectedYears.length}</span>}
              </span>
              <FaChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showMobileFilter ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile: collapsible */}
            <AnimatePresence>
              {showMobileFilter && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="md:hidden overflow-hidden border border-white/10 rounded-xl px-4 py-4 mb-4 bg-white/2"
                >
                  {filterPanel}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop: always visible */}
            <div className="hidden md:block">{filterPanel}</div>
          </aside>

          {/* ── Right: Search + Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="relative mb-6">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Cari judul, penulis, venue, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/3 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Count */}
            <p className="text-xs text-gray-600 mb-5">
              {loading ? 'Memuat...' : `${filtered.length} publikasi ditemukan`}
              {hasFilter && !loading && ` dari ${publications.length} total`}
            </p>

            {/* Grid */}
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="w-7 h-7 border-2 border-white/15 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <p className="text-gray-600 text-sm">Tidak ada publikasi yang sesuai.</p>
                {hasFilter && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline">Reset filter</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {filtered.map((pub, i) => (
                    <PubCard key={pub.id} pub={pub} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
