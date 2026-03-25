import React from "react";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import useTranslation from "../hooks/useTranslation";

const Settings = () => {
  const { t } = useTranslation();
  useTitle(t("pages.settings.title"));

  return (
    <div>
      <div className="flex items-center justify-between p-4">
        <Title
          title={t("pages.settings.title")}
          subtitle={t("pages.settings.subtitle")}
        />
      </div>
    </div>
  );
};

export default Settings;
