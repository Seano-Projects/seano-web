import React from "react";
import { useLocation } from "react-router-dom";
import { Topbar } from "../Layout";

const Main = ({
  children,
  isSidebarOpen,
  selectedVehicle,
  setSelectedVehicle,
}) => {
  const location = useLocation();

  // hanya tampil di tracking & missions
  const showTopbar = ["/tracking"].includes(location.pathname);

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
        className={`text-gray-500 bg-white px-4 mt-12
                    transition-all duration-300 dark:bg-black dark:text-gray-400
                    min-h-[calc(100vh-56px)] pb-9
                    ${isSidebarOpen ? "md:ml-64 ml-16" : "ml-16"} ${
                      showTopbar ? "pt-21" : "pt-6"
                    }`}
      >
        {children}
      </div>
    </div>
  );
};

export default Main;
