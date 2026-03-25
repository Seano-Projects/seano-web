import useTitle from "../../hooks/useTitle";
import useTranslation from "../../hooks/useTranslation";
import { Title } from "../../components/ui";

const MBES = () => {
  const { t } = useTranslation();
  useTitle(t("pages.mbes.title"));

  return (
    <div className="p-4">
      <Title
        title={t("pages.mbes.title")}
        subtitle={t("pages.mbes.subtitle")}
      />
    </div>
  );
};

export default MBES;
