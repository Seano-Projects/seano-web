import { motion } from "framer-motion";
import { HiArrowLeft } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import logoSeano from "../assets/logo_seano.webp";
import Gradient1 from "../assets/Gradient1.webp";
import { useTranslation } from "../hooks/useTranslation";

const Demo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-black font-openSans flex flex-col overflow-hidden relative">
      <div className="absolute top-0 left-0 w-96 h-96 pointer-events-none opacity-20 z-0">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[120px]" />
      </div>
      <div className="absolute bottom-0 right-0 w-96 h-96 pointer-events-none opacity-15 z-0">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[100px]" />
      </div>

      {/* Navbar */}
      <div className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-white/8">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
        >
          <HiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span className="text-sm font-medium">{t("demo.back")}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <img src={logoSeano} width={32} alt="Seano Logo" />
          <span className="text-lg font-semibold italic bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
            Seano
          </span>
        </div>

        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12 space-y-3"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-0.5 bg-primary" />
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              {t("demo.label")}
            </span>
            <div className="w-8 h-0.5 bg-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            {t("demo.heading")}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {t("demo.description")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.15 }}
          className="w-full max-w-4xl"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60"
            style={{ aspectRatio: "16/9" }}
          >
            <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-primary/30 via-transparent to-secondary/20 pointer-events-none z-10" />
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/EJMiFwDYMkk?si=W7TQe7_EX0LwWSv1&autoplay=1&rel=0&modestbranding=1"
              title={t("demo.videoTitle")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-7 py-3 bg-linear-to-r from-primary via-secondary to-primary bg-size-[200%_100%] bg-left hover:bg-right text-white font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all duration-500 text-sm"
          >
            {t("demo.getItNow")}
          </a>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-7 py-3 bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/30 text-white font-semibold rounded-full transition-all duration-300 text-sm"
          >
            {t("demo.backToHome")}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Demo;
