import React, { useState, useEffect, useMemo, useContext, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import LinkItem from "./LinkItem";
import { usePermission } from "../../../hooks/usePermission";
import { AuthContext } from "../../../contexts/AuthContext";
import useTranslation from "../../../hooks/useTranslation";
import { NavLink } from "react-router-dom";

const GAP = 8;

const MenuGroup = ({
  title,
  icon: GroupIcon,
  items,
  isSidebarOpen,
  adminOnly,
  userOnly,
  requiredPermission,
}) => {
  const { user } = useContext(AuthContext);
  const { hasPermission } = usePermission();
  const { t } = useTranslation();

  // Expanded state (for open sidebar)
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(`menuGroup_${title}_expanded`);
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Floating popup state (for collapsed sidebar)
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState({});

  // Tooltip state (collapsed, hover only when popup closed)
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(`menuGroup_${title}_expanded`, JSON.stringify(isExpanded));
  }, [isExpanded, title]);

  const filteredItems = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role?.toLowerCase() === "admin";
    return items.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
      return true;
    });
  }, [user, items, hasPermission]);

  const computePositions = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setPopupStyle({
      position: "fixed",
      left: rect.right + GAP,
      top: mid,
      transform: "translateY(-50%)",
      zIndex: 9999,
    });
    setTooltipStyle({
      position: "fixed",
      left: rect.right + GAP,
      top: mid,
      transform: "translateY(-50%)",
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!isPopupOpen && !showTooltip) return;
    const id = requestAnimationFrame(computePositions);
    const handler = () => computePositions();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isPopupOpen, showTooltip, computePositions]);

  // Close popup on outside click or Esc
  useEffect(() => {
    if (!isPopupOpen) return;
    const handleClick = (e) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setIsPopupOpen(false);
      }
    };
    const handleEsc = (e) => { if (e.key === "Escape") setIsPopupOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isPopupOpen]);

  // Close popup when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) setIsPopupOpen(false);
  }, [isSidebarOpen]);

  if (adminOnly && user?.role?.toLowerCase() !== "admin") return null;
  if (userOnly && user?.role?.toLowerCase() === "admin") return null;
  if (requiredPermission && !hasPermission(requiredPermission)) return null;
  if (filteredItems.length === 0) return null;

  const handleHeaderClick = () => {
    if (isSidebarOpen) {
      setIsExpanded((prev) => !prev);
    } else {
      setShowTooltip(false);
      computePositions();
      setIsPopupOpen((prev) => !prev);
    }
  };

  // Floating popup for collapsed mode
  const floatingPopup =
    !isSidebarOpen &&
    isPopupOpen &&
    createPortal(
      <div
        ref={popupRef}
        className="min-w-44 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden py-1"
        style={{ ...popupStyle, visibility: popupStyle.left != null ? "visible" : "hidden" }}
      >
        <p className="px-3 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-200 dark:border-gray-700">
          {t(title)}
        </p>
        <ul className="py-1">
          {filteredItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <NavLink
                  to={item.href}
                  onClick={() => setIsPopupOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  {Icon && <Icon size={14} className="shrink-0" aria-hidden="true" />}
                  <span>{t(item.text)}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>,
      document.body,
    );

  // Tooltip (collapsed, hover when popup closed)
  const tooltipPortal =
    !isSidebarOpen &&
    !isPopupOpen &&
    showTooltip &&
    createPortal(
      <div
        role="tooltip"
        className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap bg-white text-black shadow-xl ring-1 ring-black/10 dark:bg-black dark:text-white dark:ring-white/20"
        style={{ ...tooltipStyle, visibility: tooltipStyle.left != null ? "visible" : "hidden" }}
      >
        {t(title)}
      </div>,
      document.body,
    );

  return (
    <div className="mb-1">
      {/* Group Header Row */}
      <button
        ref={triggerRef}
        onClick={handleHeaderClick}
        onMouseEnter={() => { if (!isSidebarOpen && !isPopupOpen) { computePositions(); setShowTooltip(true); } }}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full flex items-center gap-2 rounded-lg p-2 transition-colors duration-200 cursor-pointer
          text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
          ${!isSidebarOpen ? "justify-center" : ""}
          ${!isSidebarOpen && isPopupOpen ? "bg-gray-100 dark:bg-gray-800" : ""}`}
        aria-expanded={isSidebarOpen ? isExpanded : isPopupOpen}
      >
        {GroupIcon && <GroupIcon size={18} className="shrink-0" aria-hidden="true" />}
        {isSidebarOpen && (
          <>
            <span className="flex-1 text-left text-sm font-semibold">{t(title)}</span>
            {isExpanded ? (
              <FaChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            ) : (
              <FaChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
            )}
          </>
        )}
      </button>

      {tooltipPortal}
      {floatingPopup}

      {/* Collapsible Items (expanded sidebar only) */}
      {isSidebarOpen && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {/* Cloudflare-style indent line */}
          <div className="ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-700 mt-0.5 space-y-0.5 list-none">
            {filteredItems.map((item, index) => (
              <LinkItem key={index} isSidebarOpen={isSidebarOpen} hideIcon={true} {...item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuGroup;


