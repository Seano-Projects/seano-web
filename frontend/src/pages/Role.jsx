import { useState } from "react";
import useTitle from "../hooks/useTitle";
import {
  RoleModal,
  EditRoleModal,
  ViewRoleModal,
  RoleTable,
  RoleHeader,
} from "../components/Widgets/Role";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";
import useRoleData from "../hooks/useRoleData";
import usePermissionData from "../hooks/usePermissionData";
import { API_ENDPOINTS } from "../config";
import { toast } from "../components/ui";
import useNotify from "../hooks/useNotify";
import useTranslation from "../hooks/useTranslation";

const Role = () => {
  const { t } = useTranslation();
  useTitle(t("pages.management.role.title"));
  const notify = useNotify();
  const { roleData, loading, actions } = useRoleData();
  const { permissionData } = usePermissionData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const handleAddRole = async (formData) => {
    const result = await actions.addRole({
      name: formData.name,
      description: formData.description,
    });
    if (!result.success) return result;

    if (formData.permissions?.length > 0 && result.data?.id) {
      try {
        for (const permissionId of formData.permissions) {
          await fetch(API_ENDPOINTS.PERMISSIONS.ASSIGN_TO_ROLE, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ role_id: result.data.id, permission_id: permissionId }),
          });
        }
      } catch (error) {}
    }

    if (result.success) {
      await notify.success("Role created successfully!", { title: "Role Created", action: notify.ACTIONS.ROLE_CREATED });
      setShowAddModal(false);
      actions.refreshData();
    } else {
      await notify.error(result.message || "Failed to create role", { title: "Role Creation Failed", action: notify.ACTIONS.ROLE_CREATED });
    }
    return result;
  };

  const handleEditRole = async (role) => {
    try {
      const response = await fetch(API_ENDPOINTS.ROLES.BY_ID(role.id), { headers: getAuthHeaders() });
      if (response.ok) {
        setSelectedRole(await response.json());
      } else {
        setSelectedRole(role);
      }
    } catch {
      setSelectedRole(role);
    }
    setShowEditModal(true);
  };

  const handleUpdateRole = async (formData) => {
    if (!selectedRole) return { success: false };
    const result = await actions.updateRole(selectedRole.id, { name: formData.name, description: formData.description });
    if (!result.success) return result;

    if (formData.permissions !== undefined) {
      try {
        const currentPermissionIds = selectedRole?.permissions?.map((p) => p.id) || [];
        const toAdd = formData.permissions.filter((id) => !currentPermissionIds.includes(id));
        const toRemove = currentPermissionIds.filter((id) => !formData.permissions.includes(id));

        for (const permissionId of toAdd) {
          await fetch(API_ENDPOINTS.PERMISSIONS.ASSIGN_TO_ROLE, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ role_id: selectedRole.id, permission_id: permissionId }),
          });
        }
        for (const permissionId of toRemove) {
          await fetch(API_ENDPOINTS.PERMISSIONS.REMOVE_FROM_ROLE(selectedRole.id, permissionId), {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
        }
      } catch (error) {}
    }

    if (result.success) {
      await notify.success("Role updated successfully!", { title: "Role Updated", action: notify.ACTIONS.ROLE_UPDATED });
      setShowEditModal(false);
      setSelectedRole(null);
      actions.refreshData();
    } else {
      await notify.error(result.message || "Failed to update role", { title: "Role Update Failed", action: notify.ACTIONS.ROLE_UPDATED });
    }
    return result;
  };

  const handleDeleteRole = (roleId, roleName) => {
    setSelectedRole({ id: roleId, name: roleName });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole || selectedRole.isBulk) return;
    const result = await actions.deleteRole(selectedRole.id);
    if (result.success) {
      await notify.success("Role deleted successfully!", { title: "Role Deleted", action: notify.ACTIONS.ROLE_DELETED });
      setShowDeleteModal(false);
      setSelectedRole(null);
    } else {
      await notify.error(result.message || "Failed to delete role", { title: "Role Deletion Failed", action: notify.ACTIONS.ROLE_DELETED });
    }
  };

  const handleViewRole = async (role) => {
    try {
      const response = await fetch(API_ENDPOINTS.ROLES.BY_ID(role.id), { headers: getAuthHeaders() });
      if (response.ok) {
        setSelectedRole(await response.json());
      } else {
        setSelectedRole(role);
      }
    } catch {
      setSelectedRole(role);
    }
    setShowViewModal(true);
  };

  const handleBulkDeleteRoles = (selectedIds) => {
    setSelectedRole({ ids: selectedIds, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!selectedRole?.ids) return;
    try {
      for (const id of selectedRole.ids) await actions.deleteRole(id);
      await notify.success(`${selectedRole.ids.length} role(s) deleted successfully!`, { title: "Bulk Role Deletion", action: notify.ACTIONS.ROLE_DELETED });
      setShowDeleteModal(false);
      setSelectedRole(null);
      actions.refreshData();
    } catch {
      await notify.error("Failed to delete some roles", { title: "Bulk Deletion Failed", action: notify.ACTIONS.ROLE_DELETED });
    }
  };

  return (
    <div className="p-4">
      <RoleHeader t={t} onAdd={() => setShowAddModal(true)} />

      <RoleTable
        roleData={roleData}
        loading={loading}
        onEdit={handleEditRole}
        onDelete={handleDeleteRole}
        onView={handleViewRole}
        onBulkDelete={handleBulkDeleteRoles}
      />

      {showAddModal && (
        <RoleModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleAddRole} permissionData={permissionData} />
      )}
      {showEditModal && selectedRole && (
        <EditRoleModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedRole(null); }} onSubmit={handleUpdateRole} role={selectedRole} permissionData={permissionData} />
      )}
      {showViewModal && selectedRole && (
        <ViewRoleModal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedRole(null); }} role={selectedRole} permissionData={permissionData} />
      )}
      {showDeleteModal && selectedRole && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setSelectedRole(null); }}
          onConfirm={selectedRole.isBulk ? handleConfirmBulkDelete : handleConfirmDelete}
          title={t("pages.management.role.deleteTitle")}
          itemName={selectedRole.isBulk ? `${selectedRole.ids.length} role(s)` : selectedRole.name}
          itemType="role"
        />
      )}
    </div>
  );
};

export default Role;
