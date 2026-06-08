import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const DOT_SMOOTHNESS = 0.2;
const BORDER_SMOOTHNESS = 0.1;

function Cursor() {
  const mouse = useRef({ x: 0, y: 0 });
  const dotPos = useRef({ x: 0, y: 0 });
  const borderPos = useRef({ x: 0, y: 0 });
  const [renderPos, setRenderPos] = useState({ dot: { x: 0, y: 0 }, border: { x: 0, y: 0 } });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onEnter = () => setIsHovering(true);
    const onLeave = () => setIsHovering(false);

    window.addEventListener("mousemove", onMove);

    const els = document.querySelectorAll("a, button, img, input, textarea, select");
    els.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    const lerp = (a, b, t) => a + (b - a) * t;
    let rafId;
    const animate = () => {
      dotPos.current.x = lerp(dotPos.current.x, mouse.current.x, DOT_SMOOTHNESS);
      dotPos.current.y = lerp(dotPos.current.y, mouse.current.y, DOT_SMOOTHNESS);
      borderPos.current.x = lerp(borderPos.current.x, mouse.current.x, BORDER_SMOOTHNESS);
      borderPos.current.y = lerp(borderPos.current.y, mouse.current.y, BORDER_SMOOTHNESS);
      setRenderPos({
        dot: { x: dotPos.current.x, y: dotPos.current.y },
        border: { x: borderPos.current.x, y: borderPos.current.y },
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      els.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: 2147483647 }}>
      {/* Dot kecil — ngikut cepat */}
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: 8,
          height: 8,
          transform: "translate(-50%, -50%)",
          left: renderPos.dot.x,
          top: renderPos.dot.y,
        }}
      />
      {/* Ring — ngikut lambat, besar saat hover */}
      <div
        className="absolute rounded-full border border-white"
        style={{
          width: isHovering ? 44 : 28,
          height: isHovering ? 44 : 28,
          transform: "translate(-50%, -50%)",
          left: renderPos.border.x,
          top: renderPos.border.y,
          transition: "width 0.3s, height 0.3s",
        }}
      />
    </div>
  );
}

const SmoothFollower = () =>
  typeof document !== "undefined" ? createPortal(<Cursor />, document.body) : null;

export default SmoothFollower;
