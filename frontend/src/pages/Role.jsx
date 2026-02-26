import { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import useTitle from "../hooks/useTitle";
import {
  RoleModal,
  EditRoleModal,
  ViewRoleModal,
  RoleTable,
} from "../components/Widgets/Role";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";
import useRoleData from "../hooks/useRoleData";
import usePermissionData from "../hooks/usePermissionData";
import { API_ENDPOINTS } from "../config";
import { Title, toast } from "../components/ui";

const Role = () => {
  useTitle("Role");
  const { roleData, loading, actions } = useRoleData();
  const { permissionData } = usePermissionData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const handleAddRole = async (formData) => {
    // First create the role
    const result = await actions.addRole({
      name: formData.name,
      description: formData.description,
    });

    if (!result.success) {
      return result;
    }

    // If role created successfully and has permissions, assign them
    if (
      formData.permissions &&
      formData.permissions.length > 0 &&
      result.data?.id
    ) {
      try {
        // Assign each permission to the role
        for (const permissionId of formData.permissions) {
          await fetch(API_ENDPOINTS.PERMISSIONS.ASSIGN_TO_ROLE, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              role_id: result.data.id,
              permission_id: permissionId,
            }),
          });
        }
      } catch (error) {
        // Role is created but permissions might not be assigned
        // Still return success but log the error
      }
    }

    if (result.success) {
      toast.success("Role created successfully!");
      setShowAddModal(false);
      // Refresh role data to get updated permissions
      actions.refreshData();
    } else {
      toast.error(result.message || "Failed to create role");
    }
    return result;
  };

  const handleEditRole = async (role) => {
    // Fetch full role data with permissions
    try {
      const response = await fetch(API_ENDPOINTS.ROLES.BY_ID(role.id), {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const fullRole = await response.json();
        setSelectedRole(fullRole);
        setShowEditModal(true);
      } else {
        // Fallback to role from table if fetch fails
        setSelectedRole(role);
        setShowEditModal(true);
      }
    } catch (error) {
      setSelectedRole(role);
      setShowEditModal(true);
    }
  };

  const handleUpdateRole = async (formData) => {
    if (!selectedRole) return { success: false };

    // First update the role
    const result = await actions.updateRole(selectedRole.id, {
      name: formData.name,
      description: formData.description,
    });

    if (!result.success) {
      return result;
    }

    // Handle permissions update
    if (formData.permissions !== undefined) {
      try {
        // Get current role permissions from selectedRole (already fetched with permissions)
        const currentPermissionIds =
          selectedRole?.permissions?.map((p) => p.id) || [];

        // Find permissions to add and remove
        const toAdd = formData.permissions.filter(
          (id) => !currentPermissionIds.includes(id),
        );
        const toRemove = currentPermissionIds.filter(
          (id) => !formData.permissions.includes(id),
        );

        // Add new permissions
        for (const permissionId of toAdd) {
          await fetch(API_ENDPOINTS.PERMISSIONS.ASSIGN_TO_ROLE, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              role_id: selectedRole.id,
              permission_id: permissionId,
            }),
          });
        }

        // Remove permissions
        for (const permissionId of toRemove) {
          await fetch(
            API_ENDPOINTS.PERMISSIONS.REMOVE_FROM_ROLE(
              selectedRole.id,
              permissionId,
            ),
            {
              method: "DELETE",
              headers: getAuthHeaders(),
            },
          );
        }
      } catch (error) {
      }
    }

    if (result.success) {
      toast.success("Role updated successfully!");
      setShowEditModal(false);
      setSelectedRole(null);
      actions.refreshData();
    } else {
      toast.error(result.message || "Failed to update role");
    }
    return result;
  };

  const handleDeleteRole = (roleId, roleName) => {
    setSelectedRole({ id: roleId, name: roleName });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;

    if (selectedRole.isBulk) return;

    const result = await actions.deleteRole(selectedRole.id);
    if (result.success) {
      toast.success("Role deleted successfully!");
      setShowDeleteModal(false);
      setSelectedRole(null);
    } else {
      toast.error(result.message || "Failed to delete role");
    }
  };

  const handleViewRole = async (role) => {
    // Fetch full role data with permissions
    try {
      const response = await fetch(API_ENDPOINTS.ROLES.BY_ID(role.id), {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const fullRole = await response.json();
        setSelectedRole(fullRole);
        setShowViewModal(true);
      } else {
        setSelectedRole(role);
        setShowViewModal(true);
      }
    } catch (error) {
      setSelectedRole(role);
      setShowViewModal(true);
    }
  };

  const handleBulkDeleteRoles = (selectedIds) => {
    setSelectedRole({ ids: selectedIds, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!selectedRole || !selectedRole.ids) return;

    try {
      for (const id of selectedRole.ids) {
        await actions.deleteRole(id);
      }
      toast.success(`${selectedRole.ids.length} role(s) deleted successfully!`);
      setShowDeleteModal(false);
      setSelectedRole(null);
      actions.refreshData();
    } catch (error) {
      toast.error("Failed to delete some roles");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Title title="Role Management" subtitle="Manage your roles" />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
        >
          <FaPlus size={16} />
          Add Role
        </button>
      </div>

      {/* Roles Table */}
      <RoleTable
        roleData={roleData}
        loading={loading}
        onEdit={handleEditRole}
        onDelete={handleDeleteRole}
        onView={handleViewRole}
        onBulkDelete={handleBulkDeleteRoles}
      />

      {/* Add Role Modal */}
      {showAddModal && (
        <RoleModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddRole}
          permissionData={permissionData}
        />
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <EditRoleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSubmit={handleUpdateRole}
          role={selectedRole}
          permissionData={permissionData}
        />
      )}

      {/* View Role Modal */}
      {showViewModal && selectedRole && (
        <ViewRoleModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRole(null);
          }}
          role={selectedRole}
          permissionData={permissionData}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedRole && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRole(null);
          }}
          onConfirm={
            selectedRole.isBulk ? handleConfirmBulkDelete : handleConfirmDelete
          }
          title="Delete Role"
          itemName={
            selectedRole.isBulk
              ? `${selectedRole.ids.length} role(s)`
              : selectedRole.name
          }
          itemType="role"
        />
      )}
    </div>
  );
};

export default Role;
