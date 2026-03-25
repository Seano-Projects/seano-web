import { Link, useLocation } from "react-router-dom";
import { FaHome, FaChevronRight } from "react-icons/fa";

const Title = ({
  title,
  subtitle,
  children,
  showBreadcrumb = true,
  breadcrumbItems,
}) => {
  const location = useLocation();

  const acronymBreadcrumbMap = {
    ctd: "CTD",
    adcp: "ADCP",
    sbes: "SBES",
    mbes: "MBES",
  };

  const formatBreadcrumbName = (pathSegment) => {
    const normalized = pathSegment.toLowerCase();
    if (acronymBreadcrumbMap[normalized]) {
      return acronymBreadcrumbMap[normalized];
    }

    return (
      pathSegment.charAt(0).toUpperCase() +
      pathSegment.slice(1).replace(/-/g, " ")
    );
  };

  // Generate breadcrumb items from current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter((path) => path);
    const breadcrumbs = [{ name: "Home", path: "/dashboard" }];

    let currentPath = "";
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const name = formatBreadcrumbName(path);
      breadcrumbs.push({ name, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs =
    Array.isArray(breadcrumbItems) && breadcrumbItems.length > 0
      ? breadcrumbItems
      : getBreadcrumbs();

  if (children) {
    return (
      <h2 className="font-bold text-gray-700 text-2xl dark:text-gray-400">
        {children}
      </h2>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-black text-3xl font-bold dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <h2 className="text-gray-600 dark:text-gray-400">{subtitle}</h2>
        )}
        {showBreadcrumb && breadcrumbs.length > 1 && (
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2">
                {index === 0 ? (
                  <Link
                    to={crumb.path}
                    className="flex items-center gap-1 text-gray-500 hover:text-fourth dark:text-gray-400 dark:hover:text-fourth transition-colors"
                  >
                    <span>{crumb.name}</span>
                  </Link>
                ) : index === breadcrumbs.length - 1 || !crumb.path ? (
                  <span className="text-fourth dark:text-fourth font-medium">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-gray-500 hover:text-fourth dark:text-gray-400 dark:hover:text-fourth transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
                {index < breadcrumbs.length - 1 && (
                  <FaChevronRight size={12} className="text-gray-400" />
                )}
              </div>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};

export default Title;
