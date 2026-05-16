import React from "react";
import { useLocation } from "react-router-dom";
import { Topbar } from "../Layout";

const fullWidthRoutes = ["/mission-planner", "/control"];

const Main = ({
  children,
  isSidebarOpen,
  selectedVehicle,
  setSelectedVehicle,
}) => {
  const location = useLocation();

  // hanya tampil di tracking & missions
  const showTopbar = ["/tracking"].includes(location.pathname);

  const isFullWidth = fullWidthRoutes.includes(location.pathname);

  return (
    <div>
      {/* Topbar hanya di halaman tertentu */}
      {showTopbar && (
        <Topbar
          isSidebarOpen={isSidebarOpen}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
        />
      )}

      {/* Content */}
      <div
        className={`text-gray-500 bg-white mt-12
                    transition-all duration-300 dark:bg-black dark:text-gray-400
                    min-h-[calc(100vh-56px)] pb-9 min-w-0
                    ${isFullWidth ? "px-4" : "px-4 md:px-8 lg:px-12"}
                    ${isSidebarOpen ? "md:ml-64 ml-0" : "md:ml-16 ml-0"} ${
                      showTopbar ? "pt-21" : "pt-6"
                    }`}
      >
        {isFullWidth ? children : (
          <div className="max-w-8xl mx-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default Main;
