import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Gradient1 from "../../../assets/Gradient1.webp";
import { GoArrowUpRight } from "react-icons/go";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { API_ENDPOINTS } from "../../../config";
import { useTranslation } from "../../../hooks/useTranslation";

const typeGradient = {
  "Conference Paper": "from-sky-900/60 via-sky-800/30 to-transparent",
  "Journal Article": "from-violet-900/60 via-violet-800/30 to-transparent",
  "Technical Report": "from-emerald-900/60 via-emerald-800/30 to-transparent",
};

const typeAccent = {
  "Conference Paper": "text-sky-400 border-sky-400/30 bg-sky-400/10",
  "Journal Article": "text-violet-400 border-violet-400/30 bg-violet-400/10",
  "Technical Report":
    "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
};

const typeDot = {
  "Conference Paper": "bg-sky-400",
  "Journal Article": "bg-violet-400",
  "Technical Report": "bg-emerald-400",
};

const CARD_W = 300;
const CARD_GAP = 16;

const PublicationCard = ({ pub }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/publication/${pub.id}`)}
      className="group relative shrink-0 w-75 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/6 transition-all duration-300 cursor-pointer"
    >
      <div
        className={`relative h-36 bg-linear-to-b ${typeGradient[pub.type] ?? "from-gray-800/60 via-gray-700/30 to-transparent"} flex flex-col justify-between p-5`}
      >
        <div
          className="absolute inset-0 opacity-6"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <span
          className={`relative self-start text-[10px] font-semibold px-2.5 py-1 rounded-full border ${typeAccent[pub.type] ?? "text-gray-400 border-white/10 bg-white/5"}`}
        >
          {pub.type}
        </span>
        <div className="relative self-end opacity-0 group-hover:opacity-100 transition-opacity">
          <GoArrowUpRight className="text-white w-5 h-5" />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-3">
          {pub.title}
        </h3>
        <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-3">
          {pub.abstract}
        </p>
        {pub.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pub.tags.map((tag, j) => (
              <span
                key={j}
                className="text-[10px] font-medium text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-white/5">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeDot[pub.type] ?? "bg-gray-400"}`}
          />
          <p className="text-gray-400 text-[11px] truncate">{pub.authors}</p>
          <span className="text-gray-600 text-[11px] ml-auto shrink-0">
            {pub.year}
          </span>
        </div>
      </div>
    </div>
  );
};

const ViewAllCard = ({ label }) => (
  <Link
    to="/papers"
    className="group relative shrink-0 w-55 rounded-2xl overflow-hidden border border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all duration-300 flex flex-col items-center justify-center gap-4 p-8 cursor-pointer"
    style={{ minHeight: "100%" }}
  >
    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-[inset_0_0_30px_rgba(56,189,248,0.08)]" />
    <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-primary/30 rounded-tl" />
    <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-primary/30 rounded-tr" />
    <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-primary/30 rounded-bl" />
    <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-primary/30 rounded-br" />
    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
      <GoArrowUpRight className="text-primary w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </div>
    <div className="text-center">
      <p className="text-white font-semibold text-sm">{label}</p>
      <p className="text-primary text-xs mt-0.5">Publications</p>
    </div>
  </Link>
);

const GlassNavBtn = ({ children, onClick, disabled, accent = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="relative flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 group"
    style={{ width: 44, height: 44 }}
  >
    <span
      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300"
      style={{
        background: accent
          ? "conic-gradient(from 180deg, rgba(56,189,248,0.9) 0%, rgba(167,139,250,0.9) 50%, rgba(56,189,248,0.9) 100%)"
          : "conic-gradient(from 180deg, rgba(255,255,255,0.4) 0%, rgba(56,189,248,0.5) 50%, rgba(255,255,255,0.4) 100%)",
        padding: 1,
        filter: "blur(1px)",
      }}
    />
    <span
      className="absolute inset-0.5 rounded-full transition-all duration-300"
      style={{
        background: accent
          ? "linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.06) 100%)"
          : "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
        backdropFilter: "blur(12px) saturate(160%)",
        WebkitBackdropFilter: "blur(12px) saturate(160%)",
        border: accent
          ? "1px solid rgba(56,189,248,0.30)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.20), 0 4px 16px rgba(0,0,0,0.25)",
      }}
    />
    <span
      className="absolute rounded-full pointer-events-none"
      style={{
        top: 6,
        left: "50%",
        transform: "translateX(-50%)",
        width: 16,
        height: 4,
        background: "rgba(255,255,255,0.18)",
        filter: "blur(2px)",
      }}
    />
    <span
      className={`relative z-10 transition-colors duration-200 ${accent ? "text-white" : "text-gray-400 group-hover:text-white"}`}
    >
      {children}
    </span>
  </button>
);

const Publications = () => {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [publications, setPublications] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(API_ENDPOINTS.PUBLICATIONS.LIST)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setPublications(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const viewAllCardW = 220;
  const totalWidth =
    publications.length * (CARD_W + CARD_GAP) + viewAllCardW + CARD_GAP;

  const scrollBy = (dir) => {
    const containerW = trackRef.current?.parentElement?.offsetWidth ?? 900;
    const step = CARD_W + CARD_GAP;
    const maxOffset = Math.max(0, totalWidth - containerW);
    setOffset((prev) => Math.min(maxOffset, Math.max(0, prev + dir * step)));
  };

  const containerW = trackRef.current?.parentElement?.offsetWidth ?? 900;
  const canPrev = offset > 0;
  const canNext = offset < Math.max(0, totalWidth - containerW);

  if (!loaded) return null;

  return (
    <div
      className="relative w-full overflow-hidden pt-16 sm:pt-20 pb-20 sm:pb-40 scroll-mt-20"
      id="publications"
    >
      <div className="absolute top-0 right-0 w-175 h-175 pointer-events-none z-0 opacity-25">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[120px]" />
      </div>
      <div className="absolute bottom-0 left-0 w-125 h-125 pointer-events-none z-0 opacity-20">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-0">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8 sm:mb-10 md:gap-6"
        >
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-0.5 bg-primary" />
              <span className="text-primary text-xs font-semibold tracking-widest uppercase">
                {t("landing.publications.label")}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              {t("landing.publications.heading")}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t("landing.publications.description")}
            </p>
          </div>

          {publications.length > 0 && (
            <div className="flex gap-2 shrink-0 pb-2">
              <GlassNavBtn onClick={() => scrollBy(-1)} disabled={!canPrev}>
                <FaChevronLeft className="w-3.5 h-3.5" />
              </GlassNavBtn>
              <GlassNavBtn onClick={() => scrollBy(1)} disabled={!canNext} accent>
                <FaChevronRight className="w-3.5 h-3.5" />
              </GlassNavBtn>
            </div>
          )}
        </motion.div>

        {publications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="py-16 flex flex-col items-start gap-2"
          >
            <p className="text-gray-500 text-sm">{t("landing.publications.empty")}</p>
          </motion.div>
        ) : (
          <>
            <div className="overflow-hidden">
              <motion.div
                ref={trackRef}
                className="flex gap-4"
                animate={{ x: -offset }}
                transition={{ type: "spring", stiffness: 300, damping: 35 }}
              >
                {publications.map((pub, i) => (
                  <motion.div
                    key={pub.id ?? i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  >
                    <PublicationCard pub={pub} />
                  </motion.div>
                ))}
                <ViewAllCard label={t("landing.publications.viewAll")} />
              </motion.div>
            </div>

            <div className="mt-6">
              <p className="text-gray-600 text-xs">
                {t("landing.publications.count").replace("{{count}}", publications.length)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Publications;
