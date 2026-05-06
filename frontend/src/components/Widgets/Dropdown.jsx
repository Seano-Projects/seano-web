import { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa6";

const Dropdown = ({
  items = [],
  selectedItem,
  onItemChange,
  placeholder = "Select an option",
  renderItem,
  renderSelectedItem,
  getItemKey,
  className = "",
  closeOnSelect = true,
  useFixedPositioning = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
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

  // Calculate position for fixed dropdown
  useEffect(() => {
    if (isOpen && useFixedPositioning && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, useFixedPositioning]);

  // Get selected item data
  // Handle both object and ID for selectedItem
  const selectedItemKey =
    selectedItem && typeof selectedItem === "object"
      ? getItemKey
        ? getItemKey(selectedItem)
        : selectedItem.id
      : selectedItem;

  const selectedItemData =
    selectedItem && typeof selectedItem === "object"
      ? selectedItem
      : items.find((item) =>
          getItemKey
            ? getItemKey(item) === selectedItemKey
            : item.id === selectedItemKey,
        );

  const handleItemSelect = (item) => {
    onItemChange(item);
    if (closeOnSelect) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-200 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {selectedItemData ? (
            renderSelectedItem ? (
              renderSelectedItem(selectedItemData)
            ) : (
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedItemData.name ||
                  selectedItemData.label ||
                  selectedItemData.title}
              </span>
            )
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              {placeholder}
            </span>
          )}
        </div>
        <FaChevronDown
          className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-[10000] max-h-60 overflow-y-auto scrollbar-hide ${
            useFixedPositioning ? "fixed" : "absolute top-full left-0 right-0 mt-1"
          }`}
          style={
            useFixedPositioning
              ? {
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                }
              : {}
          }
        >
          {items.length === 0 ? (
            <div className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
              No items available
            </div>
          ) : (
            items.map((item) => {
              const itemKey = getItemKey ? getItemKey(item) : item.id;
              const isSelected = selectedItemKey === itemKey;

              return (
                <button
                  type="button"
                  key={itemKey}
                  onClick={() => handleItemSelect(item)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-200 flex items-center gap-3 ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-600 hover:bg-blue-200 dark:hover:bg-blue-500"
                      : ""
                  }`}
                >
                  {renderItem ? (
                    renderItem(item, isSelected)
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {item.name || item.label || item.title}
                        </div>
                        {(item.code || item.subtitle || item.description) && (
                          <div className="text-gray-600 dark:text-gray-300 text-sm">
                            {item.code || item.subtitle || item.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-blue-600 dark:text-white">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
