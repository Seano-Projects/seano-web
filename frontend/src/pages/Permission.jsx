import { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import useTitle from "../hooks/useTitle";
import {
  PermissionModal,
  EditPermissionModal,
  ViewPermissionModal,
  PermissionTable,
} from "../components/Widgets/Permission";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";
import usePermissionData from "../hooks/usePermissionData";
import { API_ENDPOINTS } from "../config";
import { Title, toast } from "../components/ui";

const Permission = () => {
  useTitle("Permission");
  const { permissionData, loading, actions } = usePermissionData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);

  const handleAddPermission = async (formData) => {
    const result = await actions.addPermission(formData);
    if (result.success) {
      toast.success("Permission created successfully!");
      setShowAddModal(false);
    } else {
      toast.error(result.message || "Failed to create permission");
    }
    return result;
  };

  const handleEditPermission = (permission) => {
    setSelectedPermission(permission);
    setShowEditModal(true);
  };

  const handleUpdatePermission = async (formData) => {
    if (!selectedPermission) return { success: false };

    const result = await actions.updatePermission(selectedPermission.id, {
      name: formData.name,
      description: formData.description,
    });

    if (result.success) {
      toast.success("Permission updated successfully!");
      setShowEditModal(false);
      setSelectedPermission(null);
    } else {
      toast.error(result.message || "Failed to update permission");
    }
    return result;
  };

  const handleDeletePermission = (permissionId, permissionName) => {
    setSelectedPermission({ id: permissionId, name: permissionName });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPermission) return;

    if (selectedPermission.isBulk) return;

    const result = await actions.deletePermission(selectedPermission.id);
    if (result.success) {
      toast.success("Permission deleted successfully!");
      setShowDeleteModal(false);
      setSelectedPermission(null);
    } else {
      toast.error(result.message || "Failed to delete permission");
    }
  };

  const handleViewPermission = async (permission) => {
    // Fetch full permission data with timestamps
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        API_ENDPOINTS.PERMISSIONS.BY_ID(permission.id),
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );
      if (response.ok) {
        const fullPermission = await response.json();
        setSelectedPermission(fullPermission);
        setShowViewModal(true);
      } else {
        // Fallback to permission from table if fetch fails
        setSelectedPermission(permission);
        setShowViewModal(true);
      }
    } catch (error) {
      setSelectedPermission(permission);
      setShowViewModal(true);
    }
  };

  const handleBulkDeletePermissions = (selectedIds) => {
    setSelectedPermission({ ids: selectedIds, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!selectedPermission || !selectedPermission.ids) return;

    try {
      for (const id of selectedPermission.ids) {
        await actions.deletePermission(id);
      }
      toast.success(
        `${selectedPermission.ids.length} permission(s) deleted successfully!`,
      );
      setShowDeleteModal(false);
      setSelectedPermission(null);
      actions.refreshData();
    } catch (error) {
      toast.error("Failed to delete some permissions");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Title
          title="Permission Management"
          subtitle="Manage your permissions"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
        >
          <FaPlus size={16} />
          Add Permission
        </button>
      </div>

      {/* Permissions Table */}
      <PermissionTable
        permissionData={permissionData}
        loading={loading}
        onEdit={handleEditPermission}
        onDelete={handleDeletePermission}
        onView={handleViewPermission}
        onBulkDelete={handleBulkDeletePermissions}
      />

      {/* Add Permission Modal */}
      {showAddModal && (
        <PermissionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPermission}
          title="Add New Permission"
        />
      )}

      {/* Edit Permission Modal */}
      {showEditModal && selectedPermission && (
        <EditPermissionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPermission(null);
          }}
          onSubmit={handleUpdatePermission}
          permission={selectedPermission}
        />
      )}

      {/* View Permission Modal */}
      {showViewModal && selectedPermission && (
        <ViewPermissionModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPermission(null);
          }}
          permission={selectedPermission}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedPermission && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedPermission(null);
          }}
          onConfirm={
            selectedPermission.isBulk
              ? handleConfirmBulkDelete
              : handleConfirmDelete
          }
          title="Delete Permission"
          itemName={
            selectedPermission.isBulk
              ? `${selectedPermission.ids.length} permission(s)`
              : selectedPermission.name
          }
          itemType="permission"
        />
      )}
    </div>
  );
};

export default Permission;
