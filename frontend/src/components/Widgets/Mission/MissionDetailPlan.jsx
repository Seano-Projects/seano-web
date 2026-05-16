import useTranslation from "../../../hooks/useTranslation";
import DataCard from "../DataCard";

const MissionDetailPlan = ({ planSteps }) => {
  const { t } = useTranslation();

  return (
    <DataCard title={t("pages.missionDetails.planHistory")}>
      <div className="max-h-160 overflow-y-auto custom-scrollbar pr-2 space-y-3">
        {planSteps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("pages.missionDetails.noPlan")}
          </div>
        ) : (
          planSteps.map((step, index) => (
            <div
              key={`${step.type}-${index}`}
              className="flex gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {step.type === "home" ? "H" : index}
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {step.description}
                </div>
                {step.metadata && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {step.metadata.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </DataCard>
  );
};

export default MissionDetailPlan;
