import React from "react";

const TimePickerField = ({
  value,
  onChange,
  placeholder = "00:00",
  className = "",
  minTime,
  maxTime,
}) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="time"
        value={value || ""}
        onChange={handleChange}
        min={minTime}
        max={maxTime}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-black border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default TimePickerField;
