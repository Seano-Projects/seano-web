import { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import useTitle from "../hooks/useTitle";
import { WidgetCard } from "../components/Widgets";
import {
  UserModal,
  EditUserModal,
  ViewUserModal,
  UserTable,
} from "../components/Widgets/User";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";
import useUserData from "../hooks/useUserData";
import useRoleData from "../hooks/useRoleData";
import usePermissionData from "../hooks/usePermissionData";
import { getUserWidgetData } from "../constant";
import { Title, toast } from "../components/ui";
import useNotify from "../hooks/useNotify";
import { WidgetCardSkeleton } from "../components/Skeleton";
import useLoadingTimeout from "../hooks/useLoadingTimeout";
import useTranslation from "../hooks/useTranslation";

const User = () => {
  const { t } = useTranslation();
  useTitle(t("pages.management.user.title"));
  const notify = useNotify();
  const { userData, loading, stats, actions } = useUserData();
  const { roleData } = useRoleData();
  const { permissionData } = usePermissionData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { loading: timeoutLoading } = useLoadingTimeout(loading, 5000);
  const shouldShowSkeleton = timeoutLoading && loading && userData.length === 0;
  const widgetData = getUserWidgetData(
    stats,
    userData,
    roleData,
    permissionData,
  );

  const handleAddUser = async (formData) => {
    const result = await actions.addUser(formData);
    if (result.success) {
      await notify.success("User created successfully!", {
        title: "User Created",
        action: notify.ACTIONS.USER_CREATED,
      });
      setShowAddModal(false);
    } else {
      await notify.error(result.error || "Failed to create user", {
        title: "User Creation Failed",
        action: notify.ACTIONS.USER_CREATED,
      });
    }
    return result;
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (formData) => {
    if (!selectedUser) return { success: false };

    const payload = { username: formData.username };
    if (formData.role_id) {
      payload.role_id = formData.role_id; // already a number from Dropdown
    }

    const result = await actions.updateUser(selectedUser.id, payload);

    if (result.success) {
      await notify.success("User updated successfully!", {
        title: "User Updated",
        action: notify.ACTIONS.USER_UPDATED,
      });
      setShowEditModal(false);
      setSelectedUser(null);
    } else {
      await notify.error(result.error || "Failed to update user", {
        title: "User Update Failed",
        action: notify.ACTIONS.USER_UPDATED,
      });
    }
    return result;
  };

  const handleDeleteUser = (id, name) => {
    setSelectedUser({ id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser || selectedUser.isBulk) return;

    const result = await actions.deleteUser(selectedUser.id);
    if (result.success) {
      await notify.success("User deleted successfully!", {
        title: "User Deleted",
        action: notify.ACTIONS.USER_DELETED,
      });
      setShowDeleteModal(false);
      setSelectedUser(null);
    } else {
      await notify.error(result.error || "Failed to delete user", {
        title: "User Deletion Failed",
        action: notify.ACTIONS.USER_DELETED,
      });
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleBulkDeleteUsers = (ids) => {
    setSelectedUser({ ids, isBulk: true });
    setShowDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!selectedUser || !selectedUser.ids) return;

    try {
      for (const id of selectedUser.ids) {
        await actions.deleteUser(id);
      }
      await notify.success(
        `${selectedUser.ids.length} user(s) deleted successfully!`,
        {
          title: "Bulk User Deletion",
          action: notify.ACTIONS.USER_DELETED,
        },
      );
      setShowDeleteModal(false);
      setSelectedUser(null);
      actions.refreshData();
    } catch (error) {
      await notify.error("Failed to delete some users", {
        title: "Bulk Deletion Failed",
        action: notify.ACTIONS.USER_DELETED,
      });
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Title
          title={t("pages.management.user.title")}
          subtitle={t("pages.management.user.subtitle")}
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
        >
          <FaPlus size={16} />
          {t("pages.management.user.add")}
        </button>
      </div>

      {/* Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
        {shouldShowSkeleton
          ? Array.from({ length: 5 }).map((_, idx) => (
              <WidgetCardSkeleton key={idx} />
            ))
          : widgetData.map((widget, index) => (
              <WidgetCard key={index} {...widget} />
            ))}
      </div>

      {/* Users Table */}
      <UserTable
        userData={userData}
        loading={loading}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onView={handleViewUser}
        onBulkDelete={handleBulkDeleteUsers}
      />

      {/* Add User Modal */}
      {showAddModal && (
        <UserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddUser}
          title={t("pages.management.user.addModalTitle")}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdateUser}
          user={selectedUser}
          roleData={roleData}
        />
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <ViewUserModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedUser && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          onConfirm={
            selectedUser.isBulk ? handleConfirmBulkDelete : handleConfirmDelete
          }
          title={t("pages.management.user.deleteTitle")}
          itemName={
            selectedUser.isBulk
              ? `${selectedUser.ids.length} user(s)`
              : selectedUser.name
          }
          itemType="user"
        />
      )}
    </div>
  );
};

export default User;
