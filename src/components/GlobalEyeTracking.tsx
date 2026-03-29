import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Loader2, X, Minimize2, Maximize2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEyeBlinkDetection } from "../hooks/useEyeBlinkDetection";
import type { HeadDirection } from "../hooks/useEyeBlinkDetection";

/**
 * GlobalEyeTracking — A floating overlay that adds hands-free
 * head-controlled cursor + blink-to-click across the ENTIRE app.
 * 
 * Renders:
 *  - A small toggle button (bottom-left corner)
 *  - A mini PiP camera feed when active
 *  - A gaze cursor that moves continuously based on head direction
 *  - Blink = click on whatever element is under the cursor
 */
export default function GlobalEyeTracking() {
  const location = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [hoveredEl, setHoveredEl] = useState<Element | null>(null);
  const [clickFlash, setClickFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorPosRef = useRef(cursorPos);
  const animRef = useRef<number | null>(null);
  const headDirRef = useRef<HeadDirection>("Center");
  const enabledRef = useRef(false);
  const hoveredElRef = useRef<Element | null>(null);

  const {
    isBlinking,
    blinkCount,
    headDirection,
    isReady,
    isLoading,
    earValue,
    startTracking,
    stopTracking,
  } = useEyeBlinkDetection({
    earThreshold: 0.25,
    minBlinkFrames: 1,
    blinkCooldownMs: 400,
    headSensitivity: 0.03,
  });

  // Keep refs in sync
  useEffect(() => { headDirRef.current = headDirection; }, [headDirection]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { hoveredElRef.current = hoveredEl; }, [hoveredEl]);

  // If we are on the dedicated eye control page, this component should not render.
  // This prevents conflicts between the two eye tracking implementations.
  const onEyeControlPage = location.pathname.includes("/eye-control");

  // Effect to automatically disable tracking if the user navigates to the dedicated page.
  useEffect(() => {
    if (onEyeControlPage && enabled) {
      // This is the "disable" part of handleToggle.
      stopTracking();
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setEnabled(false);
      prevBlinkRef.current = 0;
      setHoveredEl(null);
    }
  }, [onEyeControlPage, enabled, stream, stopTracking]);

  // ===== CONTINUOUS CURSOR MOVEMENT =====
  // Head direction controls cursor *velocity*, not one-shot jumps.
  // Cursor moves smoothly while head is turned away from center.
  useEffect(() => {
    if (!enabled || !isReady) return;

    const SPEED = 30; // pixels per frame
    const EDGE_PADDING = 10;

    const moveCursor = () => {
      if (!enabledRef.current) return;

      const dir = headDirRef.current;
      setCursorPos(prev => {
        let newX = prev.x;
        let newY = prev.y;
        if (dir === "Left") newX = Math.max(EDGE_PADDING, prev.x - SPEED);
        if (dir === "Right") newX = Math.min(window.innerWidth - EDGE_PADDING, prev.x + SPEED);
        if (dir === "Up") newY = Math.max(EDGE_PADDING, prev.y - SPEED);
        if (dir === "Down") newY = Math.min(window.innerHeight - EDGE_PADDING, prev.y + SPEED);

        // Only update state if the position has actually changed
        if (newX === prev.x && newY === prev.y) return prev;

        const updated = { x: newX, y: newY };
        cursorPosRef.current = updated;
        return updated;
      });

      animRef.current = requestAnimationFrame(moveCursor);
    };

    animRef.current = requestAnimationFrame(moveCursor);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [enabled, isReady]);

  // ===== HOVER DETECTION =====
  // Find what element is under the cursor and highlight it
  useEffect(() => {
    if (!enabled || !isReady) {
      setHoveredEl(null);
      return;
    }

    const interval = setInterval(() => {
      const { x, y } = cursorPosRef.current;
      // Temporarily hide our cursor element so elementFromPoint doesn't find it
      const cursorEl = document.getElementById("global-eye-cursor");
      if (cursorEl) cursorEl.style.display = "none";

      const el = document.elementFromPoint(x, y);

      if (cursorEl) cursorEl.style.display = "";

      // Check if it's something clickable
      if (el) {
        const clickable = el.closest("a, button, [role='button'], [onclick], input, select, textarea, [tabindex]");
        setHoveredEl(clickable || null);
      } else {
        setHoveredEl(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [enabled, isReady]);

  // ===== BLINK-TO-CLICK =====
  const prevBlinkRef = useRef(0);

  useEffect(() => {
    if (blinkCount === 0 || blinkCount === prevBlinkRef.current) return;
    prevBlinkRef.current = blinkCount;

    if (!enabledRef.current || !isReady) return;

    // Click!
    setClickFlash(true);
    setTimeout(() => setClickFlash(false), 300);

    const { x, y } = cursorPosRef.current;

    // Hide cursor, find element, restore cursor
    const cursorEl = document.getElementById("global-eye-cursor");
    if (cursorEl) cursorEl.style.display = "none";
    const target = document.elementFromPoint(x, y);
    if (cursorEl) cursorEl.style.display = "";

    // Prioritize clicking the element that is visually highlighted to the user
    let clickable = hoveredElRef.current as HTMLElement;

    // Fallback to whatever is exactly under the cursor right now
    if (!clickable && target) {
      clickable = target.closest("a, button, [role='button'], [onclick], input, select, textarea, [tabindex]") as HTMLElement;
    }

    if (clickable) {
      // Trigger a real click
      clickable.click();
      clickable.focus();

      // Announce what was clicked
      const label = clickable.textContent?.trim().slice(0, 40) || "element";
      const u = new SpeechSynthesisUtterance(`Clicked: ${label}`);
      u.rate = 1.2;
      window.speechSynthesis.speak(u);
    }
  }, [blinkCount, isReady]);

  // ===== KEYBOARD FALLBACK =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current || !isReady) return;
      if (e.key.toLowerCase() === "b") {
        setClickFlash(true);
        setTimeout(() => setClickFlash(false), 300);

        const { x, y } = cursorPosRef.current;
        const cursorEl = document.getElementById("global-eye-cursor");
        if (cursorEl) cursorEl.style.display = "none";
        const target = document.elementFromPoint(x, y);
        if (cursorEl) cursorEl.style.display = "";

        let clickable = hoveredElRef.current as HTMLElement;
        if (!clickable && target) {
          clickable = target.closest("a, button, [role='button'], [onclick], input, select, textarea, [tabindex]") as HTMLElement;
        }

        if (clickable) {
          clickable.click();
          clickable.focus();
          const label = clickable.textContent?.trim().slice(0, 40) || "element";
          const u = new SpeechSynthesisUtterance(`Clicked: ${label}`);
          u.rate = 1.2;
          window.speechSynthesis.speak(u);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReady]);

  // ===== AUTO-SCROLL near edges =====
  useEffect(() => {
    if (!enabled || !isReady) return;

    const scrollInterval = setInterval(() => {
      const { y } = cursorPosRef.current;
      const dir = headDirRef.current;
      const h = window.innerHeight;
      const SCROLL_ZONE = 150;
      const SCROLL_SPEED = 12;

      if (y < SCROLL_ZONE && dir === "Up") {
        window.scrollBy({ top: -SCROLL_SPEED, behavior: "auto" });
      } else if (y > h - SCROLL_ZONE && dir === "Down") {
        window.scrollBy({ top: SCROLL_SPEED, behavior: "auto" });
      }
    }, 16);

    return () => clearInterval(scrollInterval);
  }, [enabled, isReady]);

  // ===== ENABLE / DISABLE =====
  const handleToggle = async () => {
    if (enabled) {
      // Disable
      stopTracking();
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setEnabled(false);
      prevBlinkRef.current = 0;
      setHoveredEl(null);
    } else {
      // Enable
      try {
        setEnabled(true);
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });
        setStream(newStream);
        setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

        // Wait for React to render the video element
        setTimeout(async () => {
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            await new Promise<void>((resolve) => {
              const v = videoRef.current!;
              const onPlay = () => { v.removeEventListener("playing", onPlay); resolve(); };
              v.addEventListener("playing", onPlay);
              v.play().catch(() => resolve());
            });
            startTracking(videoRef.current);
          }
        }, 100);
      } catch (err) {
        console.error("Camera error:", err);
        const u = new SpeechSynthesisUtterance("Error accessing camera. Please check permissions.");
        window.speechSynthesis.speak(u);
        setEnabled(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [stopTracking]);

  // ===== HIGHLIGHT BOX for hovered element =====
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (hoveredEl) {
      const rect = hoveredEl.getBoundingClientRect();
      setHighlightRect(rect);
    } else {
      setHighlightRect(null);
    }
  }, [hoveredEl, cursorPos]);

  // Don't render anything on the dedicated eye control page
  if (onEyeControlPage) {
    return null;
  }

  return (
    <>
      {/* ===== GAZE CURSOR ===== */}
      {enabled && isReady && (
        <div
          id="global-eye-cursor"
          className="fixed pointer-events-none z-[99998]"
          style={{
            left: cursorPos.x - 16,
            top: cursorPos.y - 16,
            width: 32,
            height: 32,
            transition: "left 0.05s linear, top 0.05s linear",
          }}
        >
          <div className="relative w-full h-full">
            {/* Outer glow */}
            <div className={`absolute inset-0 rounded-full blur-md transition-colors ${clickFlash ? "bg-[#00FF00]/60" : hoveredEl ? "bg-[#FF00FF]/30" : "bg-[#00FFFF]/20"
              }`} />
            {/* Ring */}
            <div className={`absolute inset-1 border-2 rounded-full transition-colors ${clickFlash ? "border-[#00FF00]" : hoveredEl ? "border-[#FF00FF]" : "border-[#00FFFF]"
              }`} />
            {/* Dot */}
            <div className={`absolute inset-[35%] rounded-full transition-colors shadow-lg ${clickFlash ? "bg-[#00FF00] shadow-[0_0_10px_#00FF00]" : hoveredEl ? "bg-[#FF00FF] shadow-[0_0_10px_#FF00FF]" : "bg-[#00FFFF] shadow-[0_0_10px_#00FFFF]"
              }`} />
          </div>
        </div>
      )}

      {/* ===== ELEMENT HIGHLIGHT ===== */}
      {enabled && isReady && highlightRect && (
        <div
          className="fixed pointer-events-none z-[99997] border-2 border-[#FF00FF]/60 rounded-lg"
          style={{
            left: highlightRect.left - 3,
            top: highlightRect.top - 3,
            width: highlightRect.width + 6,
            height: highlightRect.height + 6,
            boxShadow: "0 0 15px rgba(255,0,255,0.15)",
            transition: "all 0.1s ease-out",
          }}
        >
          <div className="absolute -top-5 left-0 px-2 py-0.5 bg-[#FF00FF] text-white text-[8px] font-mono uppercase tracking-wider rounded-t-md whitespace-nowrap">
            Blink to click
          </div>
        </div>
      )}

      {/* ===== CLICK RIPPLE ===== */}
      <AnimatePresence>
        {clickFlash && enabled && (
          <motion.div
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="fixed pointer-events-none z-[99999] w-12 h-12 rounded-full border-2 border-[#00FF00]"
            style={{
              left: cursorPos.x - 24,
              top: cursorPos.y - 24,
            }}
          />
        )}
      </AnimatePresence>

      {/* ===== FLOATING CONTROL WIDGET ===== */}
      <div className="fixed bottom-6 left-6 z-[99990] flex flex-col items-start gap-3">
        {/* Mini Camera PiP + Status Panel */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9, height: 0 }}
              animate={{
                opacity: minimized ? 0 : 1,
                y: minimized ? 20 : 0,
                scale: minimized ? 0.9 : 1,
                height: minimized ? 0 : "auto",
                pointerEvents: minimized ? "none" : "auto"
              }}
              exit={{ opacity: 0, y: 20, scale: 0.9, height: 0 }}
              className="w-72 bg-[#111215] border border-white/10 rounded-2xl shadow-2xl overflow-hidden origin-bottom-left"
            >
              {/* Mini camera feed */}
              <div className="relative aspect-video bg-black overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 text-[#00FFFF] animate-spin mb-1" />
                    <p className="text-[9px] font-mono text-[#00FFFF] uppercase">Loading Model</p>
                  </div>
                )}

                {/* Top bar */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                  {isReady && (
                    <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-pulse" />
                      <span className="text-[8px] font-mono text-[#00FFFF] uppercase tracking-wider">Live</span>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => setMinimized(true)} className="p-1 bg-black/60 rounded-md hover:bg-black/80 transition-colors">
                      <Minimize2 className="w-3 h-3 text-white/50" />
                    </button>
                    <button onClick={handleToggle} className="p-1 bg-red-500/20 rounded-md hover:bg-red-500/40 transition-colors">
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Direction indicator */}
                {isReady && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md">
                    <span className={`text-[9px] font-mono font-bold uppercase ${headDirection !== "Center" ? "text-[#00FFFF]" : "text-white/30"
                      }`}>
                      {headDirection}
                    </span>
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="px-3 py-2.5 space-y-2">
                {isReady && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-[9px] font-mono text-green-400 uppercase tracking-wider">Active</span>
                    </div>
                    <span className="text-[9px] font-mono text-white/20">
                      EAR: {earValue.toFixed(2)} | Blinks: {blinkCount}
                    </span>
                  </div>
                )}

                {/* EAR bar */}
                {isReady && (
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${Math.min(100, (earValue / 0.4) * 100)}%`,
                        backgroundColor: earValue < 0.17 ? "#FF4444" : earValue < 0.22 ? "#FFaa00" : "#00FFFF",
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle / Restore Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={enabled && minimized ? () => setMinimized(false) : handleToggle}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider shadow-xl transition-all ${enabled
            ? isReady
              ? "bg-[#00FFFF] text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              : "bg-yellow-500 text-black shadow-[0_0_20px_rgba(255,170,0,0.3)] animate-pulse"
            : "bg-[#151619] text-white/60 border border-white/10 hover:border-[#00FFFF]/50 hover:text-[#00FFFF]"
            }`}
        >
          {enabled ? (
            minimized ? (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Show Eye Tracking</span>
                <div className="w-2 h-2 bg-black/30 rounded-full animate-pulse" />
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>{isReady ? "Eye Control Active" : "Loading Model..."}</span>
              </>
            )
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Enable Eye Control</span>
            </>
          )}
        </motion.button>
      </div>
    </>
  );
}
