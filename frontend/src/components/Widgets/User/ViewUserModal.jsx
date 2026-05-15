import { Modal } from "../../ui";
import useActiveSessions from "../../../hooks/useActiveSessions";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { FaDesktop, FaMobile, FaGlobe } from "react-icons/fa";
import axiosInstance from "../../../utils/axiosConfig";
import { toast } from "../../ui";

const ViewUserModal = ({ isOpen, onClose, user }) => {
  const { user: currentUser } = useAuthContext();
  // Handle both string and object role format
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role?.name === 'admin';
  const { sessions, loading: sessionsLoading, error: sessionsError, refetch } = useActiveSessions(isAdmin && isOpen);
  
  if (!user) return null;

  const userData = user.originalUser || user;
  
  // Filter sessions for this user (only if admin)
  const userSessions = isAdmin ? sessions.filter(session => session.user_id === userData.id) : [];

  const handleLogoutSession = async (sessionId) => {
    try {
      await axiosInstance.delete(`/api/auth/sessions/${sessionId}`);
      toast.success("Session logged out successfully");
      refetch(); // Refresh sessions list
    } catch (error) {
      toast.error("Failed to logout session");
      console.error("Logout session error:", error);
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <FaGlobe className="w-4 h-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <FaMobile className="w-4 h-4" />;
    }
    return <FaDesktop className="w-4 h-4" />;
  };

  const getBrowserName = (userAgent) => {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    return 'Other';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="View User Details" size="lg">
      <div className="space-y-6">
        {/* User Info Section */}
        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Username
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
              {userData.username || "Not set"}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Email
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
              {userData.email || "No email"}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Status
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  userData.is_verified
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
                    : "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
                }`}
              >
                {userData.is_verified ? "Verified" : "Pending"}
              </span>
            </div>
          </div>

          {/* Role */}
          {userData.role && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                Role
              </label>
              <div className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white">
                {userData.role.name || "No role"}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Created
              </label>
              <div className="text-sm text-gray-900 dark:text-white">
                {userData.created_at
                  ? new Date(userData.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Unknown"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Last Updated
              </label>
              <div className="text-sm text-gray-900 dark:text-white">
                {userData.updated_at
                  ? new Date(userData.updated_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Unknown"}
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions Section - Only for Admin */}
        {isAdmin && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Active Sessions ({userSessions.length}/4)
              </h3>
              {userSessions.length === 0 && !sessionsLoading && (
                <span className="text-sm text-gray-500 dark:text-gray-400">No active sessions</span>
              )}
            </div>
            
            {sessionsError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500 dark:text-red-400">{sessionsError}</p>
              </div>
            ) : sessionsLoading ? (
              <div className="text-center py-4">
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading sessions...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-scroll custom-scrollbar pr-2">
                {userSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600 dark:text-blue-400">
                        {getDeviceIcon(session.user_agent)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {session.ip_address}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getBrowserName(session.user_agent)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Last used: {(() => {
                            const date = new Date(session.last_used);
                            // Manually format to WIB since database already stores in WIB
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const year = date.getFullYear();
                            const hours = date.getHours().toString().padStart(2, '0');
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            const seconds = date.getSeconds().toString().padStart(2, '0');
                            return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds} WIB`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created: {(() => {
                            const date = new Date(session.created_at);
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}/${month}/${year}`;
                          })()}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Expires: {(() => {
                            const date = new Date(session.expires_at);
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}/${month}/${year}`;
                          })()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLogoutSession(session.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="Logout this session"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default ViewUserModal;

