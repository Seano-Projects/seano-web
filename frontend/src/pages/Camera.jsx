import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaVideo,
  FaVideoSlash,
  FaExpand,
  FaCompress,
  FaPlug,
  FaCircleQuestion,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa6";
import useTitle from "../hooks/useTitle";
import useTranslation from "../hooks/useTranslation";
import useVehicleData from "../hooks/useVehicleData";
import { toast } from "../components/ui";
import Dropdown from "../components/Widgets/Dropdown";
import WizardModal from "../components/ui/WizardModal";

const Camera = () => {
  const { t } = useTranslation();
  useTitle("Camera Control");

  const { vehicles } = useVehicleData();
  const [streamName, setStreamName] = useState("");
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraConnecting, setCameraConnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(1);
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-fill stream name when vehicle list loads and only one vehicle exists
  useEffect(() => {
    if (vehicles?.length === 1 && !streamName) {
      const code = vehicles[0]?.code ?? vehicles[0]?.name ?? "";
      setStreamName("live/" + code.toLowerCase().replace(/\s+/g, "-"));
    }
  }, [vehicles]);

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
      if (!name) return;
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

        const res = await fetch(`/mediamtx/${name}/whep`, {
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
                />
              );
            })()}
          <button
            onClick={() => {
              setGuideStep(1);
              setShowGuide(true);
            }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-white transition-colors text-sm font-medium whitespace-nowrap"
            title="User Guide"
          >
            <FaCircleQuestion className="text-blue-500" />
            User Guide
          </button>
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

      {/* User Guide WizardModal */}
      <WizardModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        title="Camera Stream Guide"
        currentStep={guideStep}
        totalSteps={4}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setGuideStep((s) => Math.max(1, s - 1))}
              disabled={guideStep === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FaChevronLeft className="text-xs" /> Prev
            </button>
            {guideStep < 4 ? (
              <button
                onClick={() => setGuideStep((s) => Math.min(4, s + 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-semibold"
              >
                Next <FaChevronRight className="text-xs" />
              </button>
            ) : (
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors text-sm font-semibold"
              >
                Done
              </button>
            )}
          </div>
        }
      >
        {guideStep === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Step 1 — Start your RTMP stream
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Open a mobile streaming app (e.g.{" "}
              <strong>Larix Broadcaster</strong>) and configure it with these
              RTMP settings:
            </p>
            <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-4 text-xs space-y-1">
              <p>
                <span className="text-gray-500">URL:</span>{" "}
                <span className="text-blue-500">
                  rtmp://72.61.141.126:1935/live
                </span>
              </p>
              <p>
                <span className="text-gray-500">Stream key:</span>{" "}
                <span className="text-green-400">&lt;vehicle-code&gt;</span>{" "}
                (e.g. <span className="text-green-400">usv-001</span>)
              </p>
            </div>
            <p className="text-xs text-gray-400">
              The full stream path will be{" "}
              <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                live/usv-001
              </code>
            </p>
          </div>
        )}
        {guideStep === 2 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Step 2 — Select vehicle or enter stream name
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Use the <strong>vehicle dropdown</strong> in the top-right to
              auto-fill the stream name, or type it manually in the input field
              at the bottom.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
              💡 The stream name is auto-prefixed with{" "}
              <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">
                live/
              </code>{" "}
              when selecting a vehicle.
            </div>
          </div>
        )}
        {guideStep === 3 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Step 3 — Connect to the stream
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Once the stream name is filled in, click the{" "}
              <strong>Connect</strong> button at the bottom-right. The viewer
              will establish a WebRTC connection to the live feed.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 text-sm text-yellow-700 dark:text-yellow-300">
              Make sure the RTMP stream is already broadcasting before clicking
              Connect.
            </div>
          </div>
        )}
        {guideStep === 4 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              Step 4 — View the live feed
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The live video will appear in the viewer. You can:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5 list-none">
              <li>
                📺 Click the <strong>expand icon</strong> (top-right of video)
                to enter fullscreen
              </li>
              <li>
                🔌 Click <strong>Disconnect</strong> to stop the stream
              </li>
              <li>
                🔄 Switch vehicles using the dropdown — it will auto-reconnect
              </li>
            </ul>
          </div>
        )}
      </WizardModal>
    </div>
  );
};

export default Camera;
