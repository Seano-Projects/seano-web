import { useMemo } from "react";
import { FaClock, FaMapMarkerAlt, FaWater, FaDatabase } from "react-icons/fa";
import useTranslation from "../../../../hooks/useTranslation";

const StatCard = ({ icon, iconBg, value, title, subtitle }) => (
  <div className="bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-slate-600/30 transition-colors duration-200 group">
    <div className="mb-4">
      <div className={`p-1.5 ${iconBg} rounded-lg inline-flex group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </div>
    </div>
    <div className="space-y-2">
      <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
        {value}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">{subtitle}</p>
    </div>
  </div>
);

export const CastInfoBar = ({ ctdData }) => {
  const { t } = useTranslation();
  const castInfo = useMemo(() => {
    if (!ctdData || ctdData.length === 0) return null;

    const latestTs = ctdData.reduce(
      (max, d) =>
        !max || new Date(d.timestamp) > new Date(max) ? d.timestamp : max,
      null,
    );
    const castEntries = ctdData.filter((d) => d.timestamp === latestTs);
    const withCoord = castEntries.find(
      (d) => d.latitude != null && d.longitude != null,
    );

    return {
      latestTs,
      castEntries,
      lat: withCoord?.latitude ?? null,
      lon: withCoord?.longitude ?? null,
      depthMax: Math.max(
        ...castEntries.map((d) => d.depth).filter(Number.isFinite),
        0,
      ),
    };
  }, [ctdData]);

  if (!castInfo) return null;

  const { latestTs, castEntries, lat, lon, depthMax } = castInfo;
  const hasCoord = lat != null && lon != null;

  const timeLabel = latestTs
    ? new Date(latestTs).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const coordLabel = hasCoord
    ? `${Number(Math.abs(lat)).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`
    : "—";
  const coordSub = hasCoord
    ? `${Number(Math.abs(lon)).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`
    : t("pages.ctd.castInfo.noCoordinates");

  return (
    <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<FaClock className="text-blue-500 text-lg" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        value={timeLabel}
        title={t("pages.ctd.castInfo.castTime")}
        subtitle={t("pages.ctd.castInfo.castTimeSub")}
      />
      <StatCard
        icon={<FaMapMarkerAlt className="text-green-500 text-lg" />}
        iconBg="bg-green-100 dark:bg-green-900/30"
        value={coordLabel}
        title={t("pages.ctd.castInfo.coordinates")}
        subtitle={coordSub}
      />
      <StatCard
        icon={<FaWater className="text-cyan-500 text-lg" />}
        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
        value={depthMax > 0 ? `${depthMax.toFixed(1)} m` : "—"}
        title={t("pages.ctd.castInfo.maxDepth")}
        subtitle={t("pages.ctd.castInfo.maxDepthSub")}
      />
      <StatCard
        icon={<FaDatabase className="text-purple-500 text-lg" />}
        iconBg="bg-purple-100 dark:bg-purple-900/30"
        value={`${castEntries.length}`}
        title={t("pages.ctd.castInfo.dataCount")}
        subtitle={t("pages.ctd.castInfo.dataCountSub")}
      />
    </div>
  );
};
