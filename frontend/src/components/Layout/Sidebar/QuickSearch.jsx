import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiCornerDownLeft } from "react-icons/fi";
import { FaShip } from "react-icons/fa";
import { FiMap } from "react-icons/fi";
import { dashboardLink, menuGroups } from "../../../constant";
import useTranslation from "../../../hooks/useTranslation";
import axiosInstance from "../../../utils/axiosConfig";
import { API_ENDPOINTS } from "../../../config";

const buildPageIndex = (t) => {
  const items = [];
  items.push({
    href: dashboardLink.href,
    label: t(dashboardLink.text),
    group: "",
    icon: dashboardLink.icon,
    type: "page",
  });
  menuGroups.forEach((group) => {
    const groupLabel = t(group.title);
    (group.items || []).forEach((item) => {
      items.push({
        href: item.href,
        label: t(item.text),
        group: groupLabel,
        icon: item.icon,
        type: "page",
      });
    });
  });
  return items;
};

const TYPE_BADGE = {
  vehicle: { label: "Vehicle", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  mission: { label: "Mission", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

const QuickSearch = ({ isSidebarOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [missions, setMissions] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dataFetchedRef = useRef(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pageIndex = useMemo(() => buildPageIndex(t), [t]);

  // Fetch vehicles + missions once when search opens
  useEffect(() => {
    if (!isOpen || dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    axiosInstance.get(API_ENDPOINTS.VEHICLES.LIST).then((res) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setVehicles(
        data.map((v) => ({
          id: v.id,
          label: v.name || `Vehicle ${v.id}`,
          sub: v.code || "",
          status: v.status || "",
          type: "vehicle",
          href: "/vehicle",
        }))
      );
    }).catch(() => {});

    axiosInstance.get(API_ENDPOINTS.MISSIONS.LIST).then((res) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setMissions(
        data.map((m) => ({
          id: m.id,
          label: m.name || `Mission ${m.id}`,
          sub: m.status || "",
          type: "mission",
          href: "/missions",
        }))
      );
    }).catch(() => {});
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Default: show first 5 pages + 2 vehicles + 2 missions
      const pages = pageIndex.slice(0, 5);
      const veh = vehicles.slice(0, 2);
      const mis = missions.slice(0, 2);
      return [...pages, ...veh, ...mis];
    }

    const q = query.toLowerCase();

    const matchedPages = pageIndex.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );

    const matchedVehicles = vehicles.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.sub.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q)
    );

    const matchedMissions = missions.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.sub.toLowerCase().includes(q)
    );

    return [...matchedPages, ...matchedVehicles, ...matchedMissions].slice(0, 12);
  }, [query, pageIndex, vehicles, missions]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const select = useCallback(
    (href) => {
      navigate(href);
      close();
    },
    [navigate, close],
  );

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? close() : open();
      }
      if (e.key === "Escape" && isOpen) close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (results[activeIndex]) select(results[activeIndex].href);
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Group results by type for section headers
  const grouped = useMemo(() => {
    const out = [];
    let lastType = null;
    results.forEach((item, index) => {
      if (item.type !== lastType) {
        out.push({ isHeader: true, type: item.type });
        lastType = item.type;
      }
      out.push({ isHeader: false, item, index });
    });
    return out;
  }, [results]);

  const trigger = (
    <button
      onClick={open}
      aria-label="Quick search"
      className={`w-full flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 ${
        isSidebarOpen ? "px-3 py-2" : "px-2 py-2 justify-center"
      }`}
    >
      <FiSearch className="shrink-0 text-base" aria-hidden="true" />
      {isSidebarOpen && (
        <>
          <span className="flex-1 text-left text-sm">Quick search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
            Ctrl K
          </kbd>
        </>
      )}
    </button>
  );

  const modal =
    isOpen &&
    createPortal(
      <div
        className="fixed inset-0 flex items-start justify-center pt-[15vh]"
        style={{ zIndex: 99999 }}
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={close}
        />

        <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-[#1c1c1c] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[70vh]">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-white/10">
            <FiSearch
              className="text-base text-gray-500 dark:text-gray-400 shrink-0"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, vehicles, missions..."
              className="flex-1 bg-transparent outline-none ring-0 border-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-0 focus:border-0"
              style={{ boxShadow: "none" }}
              aria-autocomplete="list"
              aria-controls="quick-search-list"
              aria-activedescendant={
                results[activeIndex] ? `qs-item-${activeIndex}` : undefined
              }
            />
            <kbd
              onClick={close}
              className="cursor-pointer inline-flex items-center rounded border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              Esc
            </kbd>
          </div>

          <ul
            id="quick-search-list"
            ref={listRef}
            role="listbox"
            className="overflow-y-auto py-1 flex-1"
          >
            {results.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No results for &ldquo;{query}&rdquo;
              </li>
            ) : (
              grouped.map((row, gi) => {
                if (row.isHeader) {
                  const sectionLabel =
                    row.type === "page"
                      ? "Pages"
                      : row.type === "vehicle"
                      ? "Vehicles"
                      : "Missions";
                  return (
                    <li
                      key={`header-${row.type}`}
                      className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                    >
                      {sectionLabel}
                    </li>
                  );
                }

                const { item, index } = row;
                const isActive = index === activeIndex;

                if (item.type === "page") {
                  const Icon = item.icon;
                  return (
                    <li key={`page-${item.href}-${index}`} role="option" aria-selected={isActive}>
                      <button
                        id={`qs-item-${index}`}
                        data-active={isActive}
                        onClick={() => select(item.href)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? "bg-gray-100 dark:bg-white/10"
                            : "hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            size={16}
                            className="text-gray-500 dark:text-gray-400 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white">
                            {item.label}
                          </p>
                          {item.group && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                              {item.group}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <FiCornerDownLeft
                            className="text-gray-400 dark:text-gray-500 text-sm shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  );
                }

                // Vehicle or Mission data result
                const badge = TYPE_BADGE[item.type];
                const DataIcon = item.type === "vehicle" ? FaShip : FiMap;

                return (
                  <li key={`${item.type}-${item.id}`} role="option" aria-selected={isActive}>
                    <button
                      id={`qs-item-${index}`}
                      data-active={isActive}
                      onClick={() => select(item.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-gray-100 dark:bg-white/10"
                          : "hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <DataIcon
                        size={14}
                        className="text-gray-400 dark:text-gray-500 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white truncate">
                          {item.label}
                        </p>
                        {item.sub && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mt-0.5 truncate">
                            {item.sub}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {isActive && (
                        <FiCornerDownLeft
                          className="text-gray-400 dark:text-gray-500 text-sm shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer hint */}
          <div className="border-t border-gray-200 dark:border-white/10 px-4 py-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">
                ↵
              </kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">
                Esc
              </kbd>
              close
            </span>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {trigger}
      {modal}
    </>
  );
};

export default QuickSearch;
