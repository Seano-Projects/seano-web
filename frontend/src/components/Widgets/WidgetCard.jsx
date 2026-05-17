const WidgetCard = ({
  title,
  value,
  icon,
  trendIcon,
  trendText,
  iconBgColor,
}) => {
  // Determine icon background color based on icon content or use provided color
  const getIconBgColor = () => {
    if (iconBgColor) return iconBgColor;

    // Extract color from icon className if available
    const iconString = icon?.props?.className || "";
    if (iconString.includes("text-blue"))
      return "bg-blue-100 dark:bg-blue-900/30";
    if (iconString.includes("text-green"))
      return "bg-green-100 dark:bg-green-900/30";
    if (iconString.includes("text-red")) return "bg-red-100 dark:bg-red-900/30";
    if (iconString.includes("text-slate"))
      return "bg-slate-100 dark:bg-slate-900/30";
    if (iconString.includes("text-orange"))
      return "bg-orange-100 dark:bg-orange-900/30";
    if (iconString.includes("text-purple"))
      return "bg-purple-100 dark:bg-purple-900/30";

    // Default fallback
    return "bg-gray-100 dark:bg-gray-900/30";
  };

  return (
    <div className="bg-white dark:bg-black border border-gray-300 dark:border-slate-600 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-slate-600/30 transition-colors duration-200 group">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-1.5 ${getIconBgColor()} rounded-lg group-hover:scale-105 transition-transform duration-200`}
        >
          <div className="flex items-center justify-center">
            {/* Check if icon has size prop (old format) or is direct SVG */}
            {icon?.props?.size ? (
              <div className="">{icon}</div>
            ) : (
              <div className="text-current">{icon}</div>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          {title}
        </p>
        <div className="flex items-center gap-1 pt-1">
          <div className="flex items-center text-xs">{trendIcon}</div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {trendText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WidgetCard;
