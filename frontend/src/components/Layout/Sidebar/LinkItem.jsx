import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { FaLock } from "react-icons/fa6";
import { useAuthContext } from "../../../hooks/useAuthContext";
import useTranslation from "../../../hooks/useTranslation";

const GAP = 8;

const LinkItem = ({
  href,
  icon: Icon,
  text,
  badge,
  isSidebarOpen,
  size,
  type,
  action,
  hideIcon,
  disabled,
  disabledReason,
}) => {
  const { logout } = useAuthContext();
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const triggerRef = useRef(null);

  const handleClick = () => {
    if (type === "button" && action === "logout") {
      logout();
    }
  };

  const updateTooltipPosition = () => {
    if (!triggerRef.current || !showTooltip) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setTooltipStyle({
      position: "fixed",
      left: rect.right + GAP,
      top: rect.top + rect.height / 2,
      transform: "translateY(-50%)",
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!showTooltip) return;
    const run = () => updateTooltipPosition();
    const id = requestAnimationFrame(run);
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showTooltip, isSidebarOpen]);

  const openTooltip = () => {
    // Disabled items always explain themselves on hover; enabled items only
    // need a tooltip when the sidebar is collapsed (label isn't visible).
    if ((disabled || !isSidebarOpen) && text) setShowTooltip(true);
  };
  const closeTooltip = () => setShowTooltip(false);

  const triggerProps = {
    ref: triggerRef,
    onMouseEnter: openTooltip,
    onMouseLeave: closeTooltip,
    // Improve touch responsiveness
    onTouchStart: openTooltip,
    onTouchEnd: closeTooltip,
    style: {
      // Ensure proper touch target size
      minHeight: "44px",
      WebkitTapHighlightColor: "transparent",
    },
  };

  const tooltipPortal =
    showTooltip &&
    text &&
    createPortal(
      disabled ? (
        <div
          role="tooltip"
          className="flex items-start gap-2 max-w-56 px-3 py-2.5 rounded-xl text-xs bg-white shadow-xl ring-1 ring-black/10 dark:bg-gray-900 dark:ring-white/10"
          style={{
            ...tooltipStyle,
            visibility: tooltipStyle.left != null ? "visible" : "hidden",
          }}
        >
          <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
            <FaLock className="text-[9px] text-amber-600 dark:text-amber-400" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-gray-800 dark:text-gray-100">
              {t(text)}
            </span>
            <span className="block mt-0.5 text-gray-500 dark:text-gray-400 whitespace-normal">
              {disabledReason || "This feature is currently unavailable"}
            </span>
          </span>
        </div>
      ) : (
        <div
          role="tooltip"
          className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap bg-white text-black shadow-xl ring-1 ring-black/10 dark:bg-black dark:text-white dark:ring-white/20"
          style={{
            ...tooltipStyle,
            visibility: tooltipStyle.left != null ? "visible" : "hidden",
          }}
        >
          {t(text)}
        </div>
      ),
      document.body,
    );

  if (disabled) {
    return (
      <li>
        <div
          {...triggerProps}
          aria-disabled="true"
          className={`flex items-center p-2 rounded-lg gap-2 cursor-not-allowed opacity-40 touch-manipulation
          ${!isSidebarOpen ? "justify-center" : ""}
          text-gray-500 dark:text-gray-500`}
        >
          {!hideIcon && <Icon size={size} />}
          <span className={`me-3 ${isSidebarOpen ? "flex-1" : "hidden"}`}>
            {t(text)}
          </span>
        </div>
        {tooltipPortal}
      </li>
    );
  }

  if (type === "button") {
    const isLogout = action === "logout";
    return (
      <li>
        <div
          {...triggerProps}
          onClick={handleClick}
          className={`flex items-center p-2 rounded-lg gap-2 transition-colors duration-200 cursor-pointer touch-manipulation
          ${!isSidebarOpen ? "justify-center" : ""}
          ${
            isLogout
              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30"
              : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
          }`}
        >
          {!hideIcon && <Icon size={size} />}
          <span className={`me-3 ${isSidebarOpen ? "flex-1" : "hidden"}`}>
            {t(text)}
          </span>
        </div>
        {tooltipPortal}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        {...triggerProps}
        to={href}
        className={({ isActive }) =>
          `flex items-center p-2 rounded-lg gap-2 transition-colors duration-200 touch-manipulation
          ${!isSidebarOpen ? "justify-center" : ""}
          ${
            isActive
              ? "bg-blue-600 text-white dark:bg-blue-500"
              : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
          }`
        }
      >
        {!hideIcon && <Icon size={size} />}
        <span className={`me-3 ${isSidebarOpen ? "flex-1" : "hidden"}`}>
          {t(text)}
        </span>
        {badge && (
          <span
            className={`inline-flex items-center justify-center px-2 ms-3 text-sm font-medium rounded-full ${badge.color} ${badge.darkColor}`}
          >
            {badge.text}
          </span>
        )}
      </NavLink>
      {tooltipPortal}
    </li>
  );
};

export default LinkItem;
