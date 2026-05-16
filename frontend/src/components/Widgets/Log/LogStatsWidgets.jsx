import React from "react";
import { WidgetCard } from "../../Widgets";
import { WidgetCardSkeleton } from "../../Skeleton";

const LogStatsWidgets = ({ widgets, shouldShowSkeleton }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
    {shouldShowSkeleton
      ? Array.from({ length: 3 }).map((_, idx) => (
          <WidgetCardSkeleton key={`widget-skeleton-${idx}`} />
        ))
      : widgets.map((widget, idx) => (
          <WidgetCard key={widget.title || `widget-${idx}`} {...widget} />
        ))}
  </div>
);

export default LogStatsWidgets;
