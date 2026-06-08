import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaArrowLeft, FaFilePdf, FaExternalLinkAlt, FaTag } from 'react-icons/fa'
import { API_ENDPOINTS, API_BASE_URL } from '../config'
import Navbar from '../components/Section/Landing/Layout/Navbar'

const typeColor = {
  'Conference Paper':   'text-sky-400 border-sky-400/30 bg-sky-400/10',
  'Journal Article':    'text-violet-400 border-violet-400/30 bg-violet-400/10',
  'Technical Report':   'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  'KTI / Tugas Akhir':  'text-amber-400 border-amber-400/30 bg-amber-400/10',
  'Laporan Penelitian': 'text-rose-400 border-rose-400/30 bg-rose-400/10',
}

const typeBg = {
  'Conference Paper':   'from-sky-800 to-sky-950',
  'Journal Article':    'from-violet-800 to-violet-950',
  'Technical Report':   'from-emerald-800 to-emerald-950',
  'KTI / Tugas Akhir':  'from-amber-800 to-amber-950',
  'Laporan Penelitian': 'from-rose-800 to-rose-950',
}

const safeUrl = (url) => {
  if (!url) return null
  try {
    const u = new URL(url)
    return (u.protocol === 'https:' || u.protocol === 'http:') ? url : null
  } catch { return null }
}

export default function PublicationPublicDetail() {
  const { id } = useParams()
  const [pub, setPub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PUBLICATIONS.BY_ID(id))
        if (!res.ok) { setNotFound(true); return }
        setPub(await res.json())
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const pdfUrl = pub?.pdf?.startsWith('/uploads/') ? `${API_BASE_URL}${pub.pdf}` : pub?.pdf || null

  return (
    <div className="min-h-screen bg-black text-white font-openSans">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16 sm:pb-20">
        {/* Back */}
        <Link
          to="/#publications"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-10 group"
        >
          <FaArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
          Kembali ke Publikasi
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : notFound || !pub ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-gray-500">Publikasi tidak ditemukan.</p>
            <Link to="/#publications" className="text-primary text-sm hover:underline flex items-center gap-1">
              <FaArrowLeft size={11} /> Kembali
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10 items-start">

            {/* Left: cover + actions */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-28">
              <div className="w-full max-w-xs mx-auto lg:max-w-none aspect-3/4 rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1`}
                    title={pub.title}
                    scrolling="no"
                    className="h-full"
                    style={{ border: 'none', overflow: 'hidden', pointerEvents: 'none', width: 'calc(100% + 20px)' }}
                  />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center gap-3 bg-linear-to-b ${typeBg[pub.type] ?? 'from-slate-700 to-slate-900'}`}>
                    <FaFilePdf className="w-14 h-14 text-white/30" />
                    <span className="text-xs text-white/30">Tidak ada dokumen</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <FaFilePdf size={14} /> Buka PDF
                  </a>
                )}
                {safeUrl(pub.doi) && (
                  <a
                    href={safeUrl(pub.doi)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <FaExternalLinkAlt size={12} /> Lihat DOI / Link
                  </a>
                )}
              </div>
            </div>

            {/* Right: detail */}
            <div className="flex flex-col gap-6">
              {/* Type + Year */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${typeColor[pub.type] ?? 'text-gray-400 border-white/10 bg-white/5'}`}>
                  {pub.type}
                </span>
                {pub.year && (
                  <span className="text-sm text-gray-500">{pub.year}</span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-snug">
                {pub.title}
              </h1>

              {/* Divider */}
              <div className="h-px bg-white/8" />

              {/* Authors */}
              <div>
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1.5">Penulis</p>
                <p className="text-sm text-gray-300">{pub.authors}</p>
              </div>

              {/* Venue */}
              {pub.venue && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1.5">Venue / Institusi</p>
                  <p className="text-sm text-gray-300">{pub.venue}</p>
                </div>
              )}

              {/* Abstract */}
              {pub.abstract && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Abstract</p>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
                    {pub.abstract}
                  </p>
                </div>
              )}

              {/* Tags */}
              {pub.tags?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <FaTag size={9} /> Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pub.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
