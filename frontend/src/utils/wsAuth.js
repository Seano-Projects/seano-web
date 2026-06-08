import axiosInstance from "./axiosConfig";
import { API_ENDPOINTS } from "../config";

let cachedToken = null;
let cachedExpiry = 0;
let pendingRequest = null;

const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

const getValidCachedToken = () => {
  if (!cachedToken) return null;
  if (Date.now() >= cachedExpiry - 15000) {
    cachedToken = null;
    cachedExpiry = 0;
    return null;
  }
  return cachedToken;
};

export const clearCachedWebSocketToken = () => {
  cachedToken = null;
  cachedExpiry = 0;
  pendingRequest = null;
};

export const fetchWebSocketToken = async () => {
  const existing = getValidCachedToken();
  if (existing) return existing;

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = axiosInstance
    .get(API_ENDPOINTS.AUTH.WS_TOKEN)
    .then((response) => {
      const token = response.data?.token || "";
      cachedToken = token;
      cachedExpiry = getTokenExpiry(token);
      pendingRequest = null;
      return token;
    })
    .catch((error) => {
      pendingRequest = null;
      clearCachedWebSocketToken();
      throw error;
    });

  return pendingRequest;
};

export const getAuthenticatedWebSocketUrl = async (baseUrl, path) => {
  const token = await fetchWebSocketToken();
  if (!token) return null;
  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
};
