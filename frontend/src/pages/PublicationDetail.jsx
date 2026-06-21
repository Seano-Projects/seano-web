import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaArrowLeft, FaFilePdf, FaExternalLinkAlt, FaTag } from 'react-icons/fa'
import { API_ENDPOINTS, API_BASE_URL } from '../config'
import { useTranslation } from '../hooks/useTranslation'

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

export default function PublicationDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [pub, setPub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PUBLICATIONS.BY_ID(id), {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        })
        if (!res.ok) { setNotFound(true); return }
        const data = await res.json()
        setPub(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-fourth border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !pub) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400">{t('publications.notFound')}</p>
        <Link to="/publications" className="text-fourth text-sm hover:underline flex items-center gap-1">
          <FaArrowLeft size={12} /> {t('publications.back')}
        </Link>
      </div>
    )
  }

  const pdfUrl = pub.pdf?.startsWith('/uploads/') ? `${API_BASE_URL}${pub.pdf}` : pub.pdf || null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        to="/publications"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-fourth transition-colors mb-6"
      >
        <FaArrowLeft size={12} /> {t('publications.backToList')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        <div className="flex flex-col gap-3">
          <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-900 shadow-lg">
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
                <FaFilePdf className="w-14 h-14 text-white/40" />
                <span className="text-xs text-white/40">{t('publications.noDocument')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <FaFilePdf size={14} /> {t('publications.openPdf')}
              </a>
            )}
            {pub.doi && (
              <a
                href={pub.doi}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-fourth text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <FaExternalLinkAlt size={13} /> {t('publications.viewDoi')}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${typeColor[pub.type] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
              {pub.type}
            </span>
            {pub.year && (
              <span className="text-sm text-gray-400">{pub.year}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-snug">
            {pub.title}
          </h1>

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('publications.authorsLabel')}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{pub.authors}</p>
          </div>

          {pub.venue && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('publications.venueLabel')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{pub.venue}</p>
            </div>
          )}

          {pub.abstract && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('publications.form.abstract')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {pub.abstract}
              </p>
            </div>
          )}

          {pub.tags?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FaTag size={10} /> Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {pub.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
