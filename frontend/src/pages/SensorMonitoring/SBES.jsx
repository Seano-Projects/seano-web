import useTitle from "../../hooks/useTitle";
import useTranslation from "../../hooks/useTranslation";
import { Title } from "../../components/ui";

const SBES = () => {
  const { t } = useTranslation();
  useTitle(t("pages.sbes.title"));

  return (
    <div className="p-4">
      <Title
        title={t("pages.sbes.title")}
        subtitle={t("pages.sbes.subtitle")}
      />
    </div>
  );
};

export default SBES;
