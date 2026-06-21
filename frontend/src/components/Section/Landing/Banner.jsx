import { HiArrowRight } from "react-icons/hi";
import { HiPlay } from "react-icons/hi2";
import { FaStar, FaCheck, FaBolt } from "react-icons/fa6";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SideRays from "./SideRays";
import { useTranslation } from "../../../hooks/useTranslation";

const fadeInUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: "easeOut", delay: i * 0.18 },
  }),
};

const Banner = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const badges = [
    { icon: <FaStar  className="w-3.5 h-3.5 text-white" />, label: t("landing.banner.badge1") },
    { icon: <FaCheck className="w-3.5 h-3.5 text-white" />, label: t("landing.banner.badge2") },
    { icon: <FaBolt  className="w-3.5 h-3.5 text-white" />, label: t("landing.banner.badge3") },
  ];

  return (
  <div className="relative min-h-screen w-full overflow-hidden bg-black">

    <SideRays
      speed={2.5}
      rayColor1="#0ea5e9"
      rayColor2="#96c8ff"
      intensity={2}
      spread={2}
      origin="top-right"
      tilt={0}
      saturation={1.5}
      blend={0.75}
      falloff={1.6}
      opacity={1}
    />

    <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-black to-transparent z-10 pointer-events-none" />

    <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="flex flex-col items-center gap-6 max-w-4xl w-full">

        <motion.h1
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
        >
          <span className="text-white">Autonomous Ocean </span>
          <br className="hidden sm:block" />
          <span className="bg-linear-to-r from-primary via-secondary to-cyan-400 bg-clip-text text-transparent">
            Intelligence
          </span>
          <span className="text-white"> for </span>
          <span className="bg-linear-to-b from-red-500 via-red-400 to-white bg-clip-text text-transparent font-extrabold">
            Indonesia
          </span>
        </motion.h1>

        <motion.p
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-gray-300 text-sm sm:text-lg max-w-2xl leading-relaxed px-2 sm:px-0"
        >
          {t("landing.banner.description")}
        </motion.p>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto"
        >
          <a
            href="#learn-more"
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 bg-linear-to-r from-primary via-secondary to-primary bg-size-[200%_100%] bg-left hover:bg-right text-white font-semibold rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all duration-500"
          >
            {t("landing.banner.learnMore")}
            <HiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>

          <button
            onClick={() => navigate("/demo")}
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 hover:border-white/40 text-white font-semibold rounded-full transition-all duration-300"
          >
            <HiPlay className="w-4 h-4" />
            {t("landing.banner.watchDemo")}
          </button>
        </motion.div>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="flex flex-row flex-wrap justify-center gap-4 sm:gap-10 pt-4"
        >
          {badges.map((b, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <span className="text-gray-300 text-sm font-medium">{b.label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  </div>
  );
};

export default Banner;
