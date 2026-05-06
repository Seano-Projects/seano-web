import React, { useState, useRef, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./DatePickerField.css";
import { FaCalendar } from "react-icons/fa6";

const DatePickerField = ({
  value,
  onChange,
  placeholder = "Select Date",
  className = "",
  minDate,
  maxDate,
  useFixedPositioning = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calculate position for fixed calendar
  useEffect(() => {
    if (isOpen && useFixedPositioning && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, useFixedPositioning]);

  const handleDateChange = (date) => {
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return placeholder;
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const dateValue = value ? new Date(value) : null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Date Input Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200 flex items-center justify-between"
      >
        <span
          className={`text-sm ${
            value
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {formatDisplayDate(value)}
        </span>
        <FaCalendar className="text-gray-500 dark:text-gray-400" />
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div
          className={`bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-[10000] ${
            useFixedPositioning ? "fixed" : "absolute top-full left-0 mt-1"
          }`}
          style={
            useFixedPositioning
              ? {
                  top: `${calendarPosition.top}px`,
                  left: `${calendarPosition.left}px`,
                }
              : {}
          }
        >
          <Calendar
            onChange={handleDateChange}
            value={dateValue}
            minDate={minDate ? new Date(minDate) : undefined}
            maxDate={maxDate ? new Date(maxDate) : undefined}
            className="border-none dark:bg-slate-800 dark:text-white"
          />
        </div>
      )}
    </div>
  );
};

export default DatePickerField;
