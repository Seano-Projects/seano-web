import Dropdown from "../Dropdown";
import { getVehicleStatusColor } from "../../../utils/vehicleStatus";

const VehicleDropdown = ({
  vehicles,
  selectedVehicle,
  onVehicleChange,
  placeholder = "Select a vessel to view details",
  className = "",
  showPlaceholder = true,
}) => {
  // Add placeholder item as first option
  const placeholderItem = {
    id: null,
    name: "Select Vehicle",
    code: "---",
    status: "offline",
    isPlaceholder: true,
  };

  // Only show placeholder in the list if no vehicle is selected
  const vehiclesWithPlaceholder =
    showPlaceholder && !selectedVehicle
      ? [placeholderItem, ...vehicles]
      : vehicles;

  // Custom render function for selected item
  const renderSelectedItem = (vehicle) => (
    <>
      {!vehicle.isPlaceholder && (
        <div
          className={`w-3 h-3 rounded-full ${getVehicleStatusColor(vehicle.status)}`}
        />
      )}
      <span
        className={`font-medium ${vehicle.isPlaceholder ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}
      >
        {vehicle.name}
      </span>
    </>
  );

  // Custom render function for dropdown items
  const renderItem = (vehicle, isSelected) => (
    <>
      {!vehicle.isPlaceholder && (
        <div
          className={`w-3 h-3 rounded-full ${getVehicleStatusColor(vehicle.status)}`}
        />
      )}
      <div className="flex-1">
        <div
          className={`font-medium ${vehicle.isPlaceholder ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}
        >
          {vehicle.name}
        </div>
        {!vehicle.isPlaceholder && (
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            {vehicle.code}
          </div>
        )}
      </div>
      {isSelected && (
        <div className="text-blue-600 dark:text-white">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </>
  );

  return (
    <Dropdown
      items={vehiclesWithPlaceholder}
      selectedItem={selectedVehicle || placeholderItem}
      onItemChange={(vehicle) => {
        // If placeholder is selected, pass null to parent
        onVehicleChange(vehicle.isPlaceholder ? null : vehicle);
      }}
      placeholder={placeholder}
      renderItem={renderItem}
      renderSelectedItem={renderSelectedItem}
      getItemKey={(vehicle) =>
        vehicle.id === null ? "placeholder" : vehicle.id
      }
      className={className}
    />
  );
};

export default VehicleDropdown;
