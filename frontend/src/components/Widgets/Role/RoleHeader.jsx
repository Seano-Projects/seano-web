import { FaPlus } from "react-icons/fa6";
import { Title } from "../../ui";

const RoleHeader = ({ t, onAdd }) => (
  <div className="flex items-center justify-between mb-4">
    <Title
      title={t("pages.management.role.title")}
      subtitle={t("pages.management.role.subtitle")}
    />
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
    >
      <FaPlus size={16} />
      {t("pages.management.role.add")}
    </button>
  </div>
);

export default RoleHeader;
