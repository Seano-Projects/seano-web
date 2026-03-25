import useTitle from "../../hooks/useTitle";
import useTranslation from "../../hooks/useTranslation";
import { Title } from "../../components/ui";

const ADCP = () => {
  const { t } = useTranslation();
  useTitle(t("pages.adcp.title"));

  return (
    <div className="p-4">
      <Title
        title={t("pages.adcp.title")}
        subtitle={t("pages.adcp.subtitle")}
      />
    </div>
  );
};

export default ADCP;
