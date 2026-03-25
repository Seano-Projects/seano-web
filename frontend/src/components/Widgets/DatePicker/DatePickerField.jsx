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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-50">
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
