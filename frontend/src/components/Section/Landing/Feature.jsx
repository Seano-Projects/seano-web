import { FaRegCompass, FaWifi, FaMicrochip } from "react-icons/fa6";
import Gradient1 from "../../../assets/Gradient1.webp";
import { GoArrowUpRight } from "react-icons/go";
import { useTranslation } from "../../../hooks/useTranslation";

const Feature = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <FaRegCompass className="w-6 h-6 text-white" />,
      title: t("landing.feature.feature1Title"),
      description: t("landing.feature.feature1Desc"),
    },
    {
      icon: <FaWifi className="w-6 h-6 text-white" />,
      title: t("landing.feature.feature2Title"),
      description: t("landing.feature.feature2Desc"),
    },
    {
      icon: <FaMicrochip className="w-6 h-6 text-white" />,
      title: t("landing.feature.feature3Title"),
      description: t("landing.feature.feature3Desc"),
    },
  ];

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-8 lg:px-0 scroll-mt-20"
      id="about"
    >
      <div className="absolute top-0 right-0 w-96 sm:w-150 lg:w-200 h-96 sm:h-150 lg:h-200 pointer-events-none z-0 opacity-50">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto pt-20 sm:pt-32 pb-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">

          <div className="flex-1 space-y-6 sm:space-y-8 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight font-semibold text-white">
              {t("landing.feature.heading")}
            </h1>
            <p className="text-base text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t("landing.feature.description")}
            </p>
            <button className="relative px-8 py-3 text-white rounded-full font-medium shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all duration-300 ease-in-out inline-block overflow-hidden bg-linear-to-r from-primary via-secondary to-primary bg-size-[200%_100%] bg-left hover:bg-right">
              {t("landing.feature.explore")}
            </button>
          </div>

          <div className="flex-1 space-y-4 sm:space-y-6 w-full">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white/5 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:border-white/20"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md group-hover:bg-white/20 transition-colors">
                    {feature.icon}
                  </div>
                  <GoArrowUpRight
                    size={28}
                    className="text-gray-500 group-hover:text-white transition-colors group-hover:translate-x-1 group-hover:-translate-y-1 transform"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feature;
