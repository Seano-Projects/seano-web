const CACHE_KEY = "google_maps_session";
const CACHE_EXPIRY_KEY = "google_maps_session_expiry";
const SESSION_TTL_MS = 13 * 24 * 60 * 60 * 1000;

export const getGoogleSatelliteUrl = async (apiKey) => {
  if (!apiKey) return null;

  const cached = localStorage.getItem(CACHE_KEY);
  const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

  if (cached && expiry && Date.now() < parseInt(expiry)) {
    return `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${cached}&key=${apiKey}`;
  }

  try {
    const res = await fetch(
      `https://tile.googleapis.com/v1/createSession?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapType: "satellite", language: "en-US", region: "ID", scale: "scaleFactor2x" }),
      }
    );
    const data = await res.json();
    if (!data.session) {
      console.error("[GoogleTiles] Session creation failed:", data);
      return null;
    }

    localStorage.setItem(CACHE_KEY, data.session);
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));

    return `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${data.session}&key=${apiKey}`;
  } catch (err) {
    console.error("[GoogleTiles] Failed to create session:", err);
    return null;
  }
};
