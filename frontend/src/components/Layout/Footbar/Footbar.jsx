import React, { useState, useEffect, useRef } from "react";
import { HiOutlineMenuAlt2, HiX } from "react-icons/hi";
import { FiBook, FiX } from "react-icons/fi";
import { FaRocket, FaBroadcastTower, FaCode, FaCog, FaMap, FaGamepad } from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import useTranslation from "../../../hooks/useTranslation";
import { usePermission } from "../../../hooks/usePermission";
import FloatingChat from "./FloatingChat";

const MENU_ITEMS = [
  {
    icon: FaRocket,
    labelKey: "gettingStarted",
    descKey: "gettingStartedDesc",
    action: "navigate",
    to: "/docs/getting-started",
    color: "text-blue-500",
  },
  {
    icon: FaMap,
    labelKey: "missionPlanner",
    descKey: "missionPlannerDesc",
    action: "navigate",
    to: "/docs/mission-planner",
    color: "text-orange-500",
  },
  {
    icon: FaGamepad,
    labelKey: "controlGuide",
    descKey: "controlGuideDesc",
    action: "navigate",
    to: "/docs/control",
    color: "text-indigo-500",
  },
  {
    icon: FaBroadcastTower,
    labelKey: "mqttTopics",
    descKey: "mqttTopicsDesc",
    action: "navigate",
    to: "/docs/mqtt",
    color: "text-green-500",
    adminOnly: true,
  },
  {
    icon: FaCode,
    labelKey: "apiDocumentation",
    descKey: "apiDocumentationDesc",
    action: "navigate",
    to: "/docs/api",
    color: "text-purple-500",
    adminOnly: true,
  },
  {
    icon: FaCog,
    labelKey: "settings",
    descKey: "settingsDesc",
    action: "navigate",
    to: "/settings",
    color: "text-gray-500",
  },
];

const Footbar = ({ isSidebarOpen, toggleSidebar }) => {
  const { t } = useTranslation();
  const { isAdmin } = usePermission();
  const [showMenu, setShowMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();

  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin());

  // Close on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Close on Escape
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (e.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showMenu]);

  const handleItem = (item) => {
    setShowMenu(false);
    if (item.action === "navigate") {
      navigate(item.to);
    } else if (item.action === "external") {
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      {/* Floating AI Chat */}
      <FloatingChat isOpen={showChat} onClose={() => setShowChat(false)} />

      {/* Floating Guide Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="fixed bottom-10 right-2 z-[10002] w-72 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              {t("helpResources.title")}
            </span>
            <button
              onClick={() => setShowMenu(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <FiX className="text-xs" />
            </button>
          </div>
          {/* Items */}
          <ul className="py-1.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.labelKey}>
                  <button
                    onClick={() => handleItem(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                  >
                    <Icon className={`text-base shrink-0 ${item.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">
                        {t(`helpResources.${item.labelKey}`)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                        {t(`helpResources.${item.descKey}`)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Footbar */}
      <div className="fixed bottom-0 left-0 right-0 h-9 z-[10050] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-2">
        {/* Left: Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="flex items-center gap-1.5 px-2 py-0.5 h-full rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 text-xs"
        >
          {isSidebarOpen ? (
            <HiX className="text-base" aria-hidden="true" />
          ) : (
            <HiOutlineMenuAlt2 className="text-base" aria-hidden="true" />
          )}
        </button>

        {/* Right: AI + Guide menu toggle */}
        <div className="flex items-center">
          <button
            onClick={() => { setShowChat((v) => !v); setShowMenu(false); }}
            title="AI Assistant"
            className={`flex items-center gap-1.5 px-2 py-0.5 h-full rounded transition-colors text-xs ${
              showChat
                ? "bg-gray-100 dark:bg-gray-800 text-blue-500 dark:text-blue-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
          >
            <BsStars className="text-base" aria-hidden="true" />
          </button>
          <button
            ref={btnRef}
            onClick={() => { setShowMenu((v) => !v); setShowChat(false); }}
            title={t("helpResources.title")}
            className={`flex items-center gap-1.5 px-2 py-0.5 h-full rounded transition-colors text-xs ${
              showMenu
                ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
          >
            <FiBook className="text-base" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Footbar;
