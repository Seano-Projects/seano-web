import { useRef, useCallback, useState } from "react";

/**
 * VirtualJoystick – analog stick that emits values in [-100, 100].
 * axis="both"       → emits (throttle, steering)
 * axis="vertical"   → knob locked to Y, emits (throttle, 0)  – forward/back
 * axis="horizontal" → knob locked to X, emits (0, steering)  – left/right
 * Snaps back to centre on release.
 *
 * Uses Pointer Events + setPointerCapture so two joysticks work simultaneously
 * with independent fingers (true multi-touch).
 */
const VirtualJoystick = ({
  onChange,
  disabled = false,
  size = 150,
  axis = "both",
}) => {
  const containerRef = useRef(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const capturedPointerRef = useRef(null);

  const knobRadius = 20;
  const maxOffset = size / 2 - knobRadius;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const getCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  }, []);

  const computePos = useCallback(
    (clientX, clientY) => {
      const { cx, cy } = getCenter();
      let dx = clientX - cx;
      let dy = clientY - cy;
      if (axis === "vertical") dx = 0;
      if (axis === "horizontal") dy = 0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxOffset) {
        dx = (dx / dist) * maxOffset;
        dy = (dy / dist) * maxOffset;
      }
      return { x: dx, y: dy };
    },
    [getCenter, maxOffset, axis],
  );

  const emitChange = useCallback(
    (x, y) => {
      const throttle = clamp(Math.round((-y / maxOffset) * 100), -100, 100);
      const steering = clamp(Math.round((-x / maxOffset) * 100), -100, 100);
      onChange?.(throttle, steering);
    },
    [maxOffset, onChange],
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      // Only capture the first pointer; ignore additional fingers on same joystick
      if (capturedPointerRef.current !== null) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      capturedPointerRef.current = e.pointerId;
      setIsActive(true);
      const pos = computePos(e.clientX, e.clientY);
      setKnobPos(pos);
      emitChange(pos.x, pos.y);
    },
    [disabled, computePos, emitChange],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (capturedPointerRef.current !== e.pointerId) return;
      e.preventDefault();
      const pos = computePos(e.clientX, e.clientY);
      setKnobPos(pos);
      emitChange(pos.x, pos.y);
    },
    [computePos, emitChange],
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (capturedPointerRef.current !== e.pointerId) return;
      capturedPointerRef.current = null;
      setIsActive(false);
      setKnobPos({ x: 0, y: 0 });
      onChange?.(0, 0);
    },
    [onChange],
  );

  const baseSize = size;
  const halfBase = baseSize / 2;
  const innerRingSize = baseSize * 0.5;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-full flex items-center justify-center select-none touch-none ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{ width: baseSize, height: baseSize }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Base circle */}
      <div className="absolute inset-0 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600" />

      {/* Crosshairs – only show the relevant axis */}
      {axis !== "horizontal" && (
        <div
          className="absolute bg-gray-300 dark:bg-gray-600 opacity-50"
          style={{
            width: 1,
            height: baseSize * 0.7,
            top: halfBase - baseSize * 0.35,
            left: halfBase - 0.5,
          }}
        />
      )}
      {axis !== "vertical" && (
        <div
          className="absolute bg-gray-300 dark:bg-gray-600 opacity-50"
          style={{
            width: baseSize * 0.7,
            height: 1,
            top: halfBase - 0.5,
            left: halfBase - baseSize * 0.35,
          }}
        />
      )}

      {/* Inner guide ring */}
      <div
        className="absolute rounded-full border border-gray-300 dark:border-gray-600 opacity-30"
        style={{
          width: innerRingSize,
          height: innerRingSize,
          top: halfBase - innerRingSize / 2,
          left: halfBase - innerRingSize / 2,
        }}
      />

      {/* Arrow affordance */}
      {axis === "vertical" && (
        <>
          <div
            className="absolute text-gray-400 dark:text-gray-500 text-xs"
            style={{ top: 4, left: "50%", transform: "translateX(-50%)" }}
          >
            ▲
          </div>
          <div
            className="absolute text-gray-400 dark:text-gray-500 text-xs"
            style={{ bottom: 4, left: "50%", transform: "translateX(-50%)" }}
          >
            ▼
          </div>
        </>
      )}
      {axis === "horizontal" && (
        <>
          <div
            className="absolute text-gray-400 dark:text-gray-500 text-xs"
            style={{ left: 4, top: "50%", transform: "translateY(-50%)" }}
          >
            ◀
          </div>
          <div
            className="absolute text-gray-400 dark:text-gray-500 text-xs"
            style={{ right: 4, top: "50%", transform: "translateY(-50%)" }}
          >
            ▶
          </div>
        </>
      )}

      {/* Knob */}
      <div
        className={`absolute rounded-full border-2 border-white dark:border-gray-900 shadow-lg z-10 ${
          isActive ? "bg-blue-400" : "bg-blue-500"
        }`}
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          top: halfBase - knobRadius,
          left: halfBase - knobRadius,
          transform: `translate(${knobPos.x}px, ${knobPos.y}px) ${isActive ? "scale(1.1)" : "scale(1)"}`,
          transition: isActive
            ? "none"
            : "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </div>
  );
};

export default VirtualJoystick;
