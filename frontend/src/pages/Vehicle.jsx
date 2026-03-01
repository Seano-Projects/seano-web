import { useState, useEffect } from "react";
import useTitle from "../hooks/useTitle";
import { Title } from "../components/ui";
import { WidgetCardSkeleton } from "../components/Skeleton";
import { WidgetCard, VehicleTable, VehicleModal } from "../components/Widgets";
import { AddVehicleWizard } from "../components/Widgets/Vehicle";
import { ConfirmModal } from "../components/ui";
import { getWidgetData } from "../constant";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import { useLogData } from "../hooks/useLogData";
import axios from "../utils/axiosConfig";
import { API_ENDPOINTS } from "../config";
import { toast } from "../components/ui";
import { FaShip } from "react-icons/fa";
import { determineVehicleStatus } from "../utils/vehicleStatus";

const Vehicle = () => {
  useTitle("Vehicle");
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton = timeoutLoading && loading && vehicles.length === 0;
  const widgetData = getWidgetData(stats, vehicles);

  // Real-time data from WebSocket
  const { vehicleLogs, ws } = useLogData();

  // Fetch vehicles from API
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.VEHICLES.LIST);

        const data = response.data;
        const processedVehicles = Array.isArray(data)
          ? data.map((vehicle) => {
              return {
                ...vehicle,
                code:
                  vehicle.code || `USV-${String(vehicle.id).padStart(3, "0")}`,
                type: vehicle.type || "USV",
                role: vehicle.role || "Patrol",
                battery_level: vehicle.battery_level || 0,
                rssi: vehicle.signal_strength
                  ? Math.round(vehicle.signal_strength)
                  : null,
              };
            })
          : [];

        setVehicles(processedVehicles);

        // Calculate stats
        const totalVehicles = processedVehicles.length;
        const onMission = processedVehicles.filter(
          (v) => v.status === "on_mission",
        ).length;
        const online = processedVehicles.filter(
          (v) => v.status === "idle" || v.status === "on_mission",
        ).length;
        const offline = processedVehicles.filter(
          (v) => v.status === "offline",
        ).length;
        const maintenance = processedVehicles.filter(
          (v) => v.status === "maintenance",
        ).length;

        setStats({
          totalToday: totalVehicles,
          totalYesterday: 0,
          onMissionToday: onMission,
          onMissionYesterday: 0,
          onlineToday: online,
          onlineYesterday: 0,
          offlineToday: offline,
          offlineYesterday: 0,
          maintenanceToday: maintenance,
          maintenanceYesterday: 0,
        });
      } catch (error) {
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [refreshTrigger]);

  // Update vehicle data with real-time WebSocket data
  useEffect(() => {
    if (!vehicleLogs || vehicleLogs.length === 0) return;

    // Group latest logs by vehicle_id
    const latestLogsByVehicle = {};
    vehicleLogs.forEach((log) => {
      const vehicleId = log.vehicle_id;
      if (
        !latestLogsByVehicle[vehicleId] ||
        new Date(log.created_at) >
          new Date(latestLogsByVehicle[vehicleId].created_at)
      ) {
        latestLogsByVehicle[vehicleId] = log;
      }
    });

    // Update vehicles with latest log data
    setVehicles((prevVehicles) =>
      prevVehicles.map((vehicle) => {
        const latestLog = latestLogsByVehicle[vehicle.id];
        if (!latestLog) return vehicle;

        // Use battery_percentage if available, otherwise calculate from voltage
        const batteryPercentage = latestLog.battery_percentage
          ? Math.round(latestLog.battery_percentage)
          : latestLog.battery_voltage
            ? Math.round(
                Math.min(
                  100,
                  Math.max(0, ((latestLog.battery_voltage - 11) / 1.6) * 100),
                ),
              )
            : vehicle.battery_level;

        // Use RSSI directly (in dBm)
        const rssi = latestLog.rssi ?? vehicle.rssi;

        // Format temperature (if it's a number, add unit; if string, use as-is)
        const temperature = latestLog.temperature_system
          ? typeof latestLog.temperature_system === "number"
            ? latestLog.temperature_system
            : latestLog.temperature_system
          : vehicle.temperature;

        const updatedVehicle = {
          ...vehicle,
          // Update position from GPS coordinates
          latitude: latestLog.latitude ?? vehicle.latitude,
          longitude: latestLog.longitude ?? vehicle.longitude,
          position:
            latestLog.latitude && latestLog.longitude
              ? `${latestLog.latitude.toFixed(4)}, ${latestLog.longitude.toFixed(4)}`
              : vehicle.position,

          // Update battery level
          battery_level: batteryPercentage,

          // Update RSSI (dBm)
          rssi: rssi,

          // Update temperature
          temperature: temperature,

          // Update last seen timestamp
          last_seen: latestLog.created_at ?? vehicle.last_seen,

          // Determine status based on last data time and WebSocket connection
          // Uses best practices: multiple thresholds, grace periods, and proper status states
          status: determineVehicleStatus({
            lastDataTime: latestLog.created_at,
            websocket: ws,

            currentTime: Date.now(),
          }),
        };

        return updatedVehicle;
      }),
    );
  }, [vehicleLogs]);

  // Force refresh vehicle data
  const refreshVehicles = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCreateOrUpdateVehicle = async (vehicleData, vehicleId = null) => {
    try {
      if (vehicleId) {
        // Update existing vehicle
        const response = await axios.put(
          API_ENDPOINTS.VEHICLES.UPDATE(vehicleId),
          vehicleData,
        );
        toast.success("Vehicle updated successfully!");
      } else {
        // Create new vehicle
        const response = await axios.post(
          API_ENDPOINTS.VEHICLES.CREATE,
          vehicleData,
        );
        toast.success("Vehicle created successfully!");
      }

      // Close modal first
      setShowVehicleModal(false);
      setEditingVehicle(null);

      // Refresh vehicle list immediately
      refreshVehicles();
    } catch (error) {
      let errorMessage = "Failed to save vehicle";

      if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map((e) => e.msg || e.message || JSON.stringify(e))
            .join(", ");
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response?.data?.error) {
        // Go backend uses "error" field
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  const handleEditVehicle = (vehicle) => {
    // Prepare vehicle data for editing
    const editData = {
      id: vehicle.id,
      name: vehicle.name,
      code: vehicle.code,
      description: vehicle.description,
      status: vehicle.statusRaw || vehicle.status.toLowerCase(),
      user_id: vehicle.user_id,
    };
    setEditingVehicle(editData);
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = (vehicleId, vehicleName) => {
    setVehicleToDelete({ id: vehicleId, name: vehicleName });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(API_ENDPOINTS.VEHICLES.DELETE(vehicleToDelete.id));
      toast.success(`Vehicle "${vehicleToDelete.name}" deleted successfully!`);

      // Close modal and reset state
      setShowDeleteModal(false);
      setVehicleToDelete(null);

      // Refresh vehicle list immediately
      refreshVehicles();
    } catch (error) {
      let errorMessage = "Failed to delete vehicle";
      if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setVehicleToDelete(null);
  };

  const handleBulkDelete = (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    setVehicleToDelete({ ids: selectedIds, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!vehicleToDelete || !vehicleToDelete.ids) return;

    setIsDeleting(true);
    try {
      await Promise.all(
        vehicleToDelete.ids.map((id) =>
          axios.delete(API_ENDPOINTS.VEHICLES.DELETE(id)),
        ),
      );

      toast.success(
        `${vehicleToDelete.ids.length} vehicle(s) deleted successfully!`,
      );
      setShowDeleteModal(false);
      setVehicleToDelete(null);
      refreshVehicles();
    } catch (error) {
      toast.error("Failed to delete some vehicles");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowVehicleModal(false);
    setEditingVehicle(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Title
          title="Vehicle Management"
          subtitle="Manage and monitor all USV vehicles"
        />
        <button
          onClick={() => setShowWizard(true)}
          className="font-semibold flex items-center gap-4 px-3 py-2 rounded-lg text-white hover:bg-blue-700 transition duration-300 cursor-pointer hover:shadow-lg hover:shadow-fourth/50 bg-fourth dark:hover:bg-blue-700"
        >
          <FaShip size={20} />
          Add Vehicle
        </button>
      </div>
      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 px-4 pb-4">
        {shouldShowSkeleton
          ? // Skeleton Loading with timeout
            Array.from({ length: 5 }).map((_, idx) => (
              <WidgetCardSkeleton key={idx} />
            ))
          : widgetData.map((item, idx) => <WidgetCard key={idx} {...item} />)}
      </div>

      <VehicleTable
        vehicleData={vehicles}
        loading={loading}
        onEdit={handleEditVehicle}
        onDelete={handleDeleteVehicle}
        onBulkDelete={handleBulkDelete}
        wsConnected={ws && ws.readyState === WebSocket.OPEN}
      />

      {/* Vehicle Modal */}
      <VehicleModal
        isOpen={showVehicleModal}
        onClose={handleCloseModal}
        onSubmit={handleCreateOrUpdateVehicle}
        editData={editingVehicle}
      />

      {/* Add Vehicle Wizard */}
      <AddVehicleWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={refreshVehicles}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVehicleToDelete(null);
        }}
        onConfirm={
          vehicleToDelete?.isBulk ? handleConfirmBulkDelete : confirmDelete
        }
        title="Delete Vehicle"
        message={
          vehicleToDelete?.isBulk
            ? `Are you sure you want to delete ${vehicleToDelete.ids.length} vehicle(s)? This action cannot be undone.`
            : vehicleToDelete
              ? `Are you sure you want to delete "${vehicleToDelete.name}"? This action cannot be undone.`
              : "Are you sure you want to delete this vehicle?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Vehicle;
