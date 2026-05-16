import React from "react";
import { ColumnToggle } from "../../ui";
import { DataTable } from "../../ui";

const LogTableTab = ({
  isRealtimePaused,
  tabKey,
  allKeys,
  labels,
  visibleKeys,
  onToggle,
  onReset,
  maxColumns,
  columns,
  data,
  searchPlaceholder,
  searchKeys,
  pageSize = 10,
  emptyMessage,
}) => (
  <div className="p-6" key={`${tabKey}-${isRealtimePaused ? "paused" : "live"}`}>
    <ColumnToggle
      allKeys={allKeys}
      labels={labels}
      visibleKeys={visibleKeys}
      onToggle={onToggle}
      onReset={onReset}
      maxColumns={maxColumns}
    />
    <DataTable
      key={`${tabKey}-table-${isRealtimePaused ? "paused" : "live"}-${pageSize}`}
      columns={columns.filter((col) => visibleKeys.has(col.accessorKey))}
      data={data}
      searchPlaceholder={searchPlaceholder}
      searchKeys={searchKeys}
      pageSize={pageSize}
      emptyMessage={emptyMessage}
    />
  </div>
);

export default LogTableTab;
