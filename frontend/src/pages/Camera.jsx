import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaVideo,
  FaVideoSlash,
  FaExpand,
  FaCompress,
  FaPlug,
} from "react-icons/fa6";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import useVehicleData from "../hooks/useVehicleData";
import { toast } from "../components/ui";
import Dropdown from "../components/Widgets/Dropdown";

const normalizeStreamName = (rawValue = "") => {
  const normalized = rawValue
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(new RegExp("\\/+", "g"), "/")
    .replace(/^\/+|\/+$/g, "");

  if (!normalized) return "";
  if (normalized.startsWith("live/")) return normalized;

  return `live/${normalized}`;
};

const Camera = () => {
  const { t } = useTranslation();
  useTitle(t("control.camera.title"));

  const { vehicles } = useVehicleData();
  const [streamName, setStreamName] = useState("");
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraConnecting, setCameraConnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-fill stream name to first vehicle on initial load
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      setStreamName("");
      return;
    }

    const streamOptions = vehicles.map((vehicle) => {
      const code = vehicle?.code ?? vehicle?.name ?? "";
      return normalizeStreamName(code);
    });

    if (!streamName) {
      setStreamName(streamOptions[0]);
      return;
    }

    if (!streamOptions.includes(streamName)) {
      setStreamName(streamOptions[0]);
    }
  }, [vehicles, streamName]);

  const disconnectCamera = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraConnected(false);
    setCameraConnecting(false);
  }, []);

  const connectCamera = useCallback(
    async (name) => {
      const normalizedName = normalizeStreamName(name);
      if (!normalizedName) return;

      disconnectCamera();
      setCameraConnecting(true);
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
          setCameraConnected(true);
          setCameraConnecting(false);
        };

        pc.oniceconnectionstatechange = () => {
          if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed" ||
            pc.iceConnectionState === "closed"
          ) {
            setCameraConnected(false);
            setCameraConnecting(false);
          }
        };

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpOffer = await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("ICE timeout")),
            10000,
          );
          const check = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              resolve(pc.localDescription.sdp);
            }
          };
          pc.addEventListener("icegatheringstatechange", check);
          check();
        });

        const res = await fetch(`/mediamtx/${normalizedName}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: sdpOffer,
        });

        if (!res.ok) throw new Error(`Stream not found (${res.status})`);

        const sdpAnswer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: sdpAnswer });
      } catch (err) {
        disconnectCamera();
        toast.error(`Camera: ${err.message}`);
      }
    },
    [disconnectCamera],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnectCamera();
  }, [disconnectCamera]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaVideo className="text-blue-500" />
            {t("control.camera.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("control.camera.subtitle")}
          </p>
        </div>

        {/* Vehicle quick-select + Guide button */}
        <div className="flex items-center gap-2">
          {vehicles?.length > 0 &&
            (() => {
              const vehicleItems = vehicles.map((v) => ({
                id: v.id,
                name: v.name ?? v.code,
                vehicleCode: v.code,
                code:
                  "live/" +
                  (v.code ?? v.name ?? "").toLowerCase().replace(/\s+/g, "-"),
              }));
              const selectedVehicleItem =
                vehicleItems.find((v) => v.code === streamName) || null;
              return (
                <Dropdown
                  items={vehicleItems}
                  selectedItem={selectedVehicleItem}
                  onItemChange={(v) => {
                    setStreamName(v.code);
                    if (cameraConnected) disconnectCamera();
                  }}
                  placeholder={t("control.camera.selectVehicle")}
                  getItemKey={(item) => item.id}
                  className="w-52"
                  renderSelectedItem={(vehicle) => (
                    <span className="font-medium text-gray-900 dark:text-white">
                      {vehicle.name}
                    </span>
                  )}
                  renderItem={(vehicle, isSelected) => (
                    <>
                      <div className="flex-1">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {vehicle.name}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-600 dark:text-white">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                />
              );
            })()}
        </div>
      </div>

      {/* Video Container */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl"
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />

        {/* No stream overlay */}
        {!cameraConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950/80">
            <FaVideoSlash className="text-6xl text-gray-500" />
            <p className="text-gray-400 text-lg font-medium">
              {cameraConnecting
                ? t("control.camera.connecting")
                : t("control.camera.noStream")}
            </p>
            {cameraConnecting && (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-lg transition-colors"
          title={
            isFullscreen
              ? t("control.camera.exitFullscreen")
              : t("control.camera.fullscreen")
          }
        >
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-3 shrink-0">
        <FaPlug
          className={`text-lg shrink-0 ${cameraConnected ? "text-green-500" : "text-gray-400"}`}
        />
        <input
          type="text"
          value={streamName}
          onChange={(e) => setStreamName(e.target.value)}
          onBlur={(e) => setStreamName(normalizeStreamName(e.target.value))}
          onKeyDown={(e) =>
            e.key === "Enter" && !cameraConnected && connectCamera(streamName)
          }
          placeholder={t("control.camera.streamPlaceholder")}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={
            cameraConnected ? disconnectCamera : () => connectCamera(streamName)
          }
          disabled={!streamName || cameraConnecting}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors whitespace-nowrap ${
            cameraConnected
              ? "bg-red-600 hover:bg-red-500"
              : !streamName || cameraConnecting
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {cameraConnecting
            ? t("control.camera.connecting")
            : cameraConnected
              ? t("control.camera.disconnect")
              : t("control.camera.connect")}
        </button>
      </div>
    </div>
  );
};

export default Camera;
