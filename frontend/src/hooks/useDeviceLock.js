import { useState, useEffect, useRef, useCallback } from "react";
import axios from "../utils/axiosConfig";
import { API_BASE_URL } from "../config";

const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const POLL_INTERVAL = 5000; // 5 seconds to check lock status when not holding lock

/**
 * useDeviceLock - Exclusive page lock for device control.
 * @param {string} deviceId - The device ID to lock.
 * @returns {{ isLocked, isLockOwner, lockedBySession }}
 */
const useDeviceLock = (deviceId) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isLockOwner, setIsLockOwner] = useState(false);
  const [lockedBySession, setLockedBySession] = useState(null);
  const sessionIdRef = useRef((() => {
    const key = "device_lock_session_id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  })());
  const heartbeatRef = useRef(null);
  const pollRef = useRef(null);
  const isLockOwnerRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isLockOwnerRef.current = isLockOwner;
  }, [isLockOwner]);

  const acquireLock = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/device-lock/acquire`, {
        device_id: deviceId,
        session_id: sessionIdRef.current,
      });
      if (res.data?.status === "locked") {
        setIsLocked(true);
        setIsLockOwner(true);
        setLockedBySession(sessionIdRef.current);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setIsLocked(true);
        setIsLockOwner(false);
        setLockedBySession(err.response.data?.locked_by_session || null);
      }
    }
  }, [deviceId]);

  const sendHeartbeat = useCallback(async () => {
    if (!deviceId) return;
    try {
      await axios.post(`${API_BASE_URL}/device-lock/heartbeat`, {
        device_id: deviceId,
        session_id: sessionIdRef.current,
      });
    } catch {
      // Lock lost - try to re-acquire
      setIsLockOwner(false);
      acquireLock();
    }
  }, [deviceId, acquireLock]);

  const checkStatus = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/device-lock/status`, {
        params: { device_id: deviceId },
      });
      if (res.data?.locked) {
        const ownedByMe = res.data.locked_by_session === sessionIdRef.current;
        setIsLocked(true);
        setIsLockOwner(ownedByMe);
        setLockedBySession(res.data.locked_by_session);
      } else {
        // Lock expired, try to acquire
        setIsLocked(false);
        setIsLockOwner(false);
        setLockedBySession(null);
        acquireLock();
      }
    } catch {
      // ignore
    }
  }, [deviceId, acquireLock]);

  // On mount: acquire lock
  useEffect(() => {
    if (!deviceId) return;
    acquireLock();
  }, [deviceId, acquireLock]);

  // Heartbeat when we own the lock, poll when we don't
  useEffect(() => {
    if (!deviceId) return;

    clearInterval(heartbeatRef.current);
    clearInterval(pollRef.current);

    if (isLockOwner) {
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    } else {
      pollRef.current = setInterval(checkStatus, POLL_INTERVAL);
    }

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(pollRef.current);
    };
  }, [deviceId, isLockOwner, sendHeartbeat, checkStatus]);

  // Release lock on page unload (tab close / navigate away) and component unmount
  useEffect(() => {
    if (!deviceId) return;

    const releaseLock = () => {
      // Only release if we actually own the lock
      if (!isLockOwnerRef.current) return;
      const token = localStorage.getItem("access_token");
      const payload = JSON.stringify({
        device_id: deviceId,
        session_id: sessionIdRef.current,
      });
      // Use fetch with keepalive for reliable delivery on tab close
      try {
        fetch(`${API_BASE_URL}/device-lock/release`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: payload,
          keepalive: true,
        });
      } catch {
        navigator.sendBeacon(
          `${API_BASE_URL}/device-lock/release`,
          new Blob([payload], { type: "application/json" }),
        );
      }
    };

    window.addEventListener("beforeunload", releaseLock);

    return () => {
      window.removeEventListener("beforeunload", releaseLock);
      releaseLock();
    };
  }, [deviceId]);

  return { isLocked, isLockOwner, lockedBySession };
};

export default useDeviceLock;
