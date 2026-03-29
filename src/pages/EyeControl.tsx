import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Eye, Zap, MousePointer2, ShieldCheck, Camera, CameraOff, CheckCircle2, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Languages, Activity, Loader2, Scan } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useSpeech } from "../hooks/useSpeech";
import { useEyeBlinkDetection } from "../hooks/useEyeBlinkDetection";
import type { HeadDirection } from "../hooks/useEyeBlinkDetection";
import { SALanguage, LANGUAGES } from "../types";
import { translateText } from "../services/geminiService";

const NAV_BUTTONS = [
  { label: "Go to Home", path: "/" },
  { label: "Open Visual Assistance", path: "/vision" },
  { label: "Open Speech & Hearing", path: "/speech-hearing" },
  { label: "About SignBridge", path: "/about" },
];

export default function EyeControl() {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [lang, setLang] = useState<SALanguage>("en-ZA");
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState<"Camera Off" | "Loading Model" | "Tracking Active">("Camera Off");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationBlinks, setCalibrationBlinks] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [blinkFlash, setBlinkFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Refs to avoid stale closures in effects
  const focusedIndexRef = useRef(focusedIndex);
  const isCalibratedRef = useRef(isCalibrated);
  const calibrationBlinksRef = useRef(calibrationBlinks);
  const isTrackingRef = useRef(isTracking);
  const prevDirectionRef = useRef<HeadDirection>("Center");

  // Keep refs in sync
  useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
  useEffect(() => { isCalibratedRef.current = isCalibrated; }, [isCalibrated]);
  useEffect(() => { calibrationBlinksRef.current = calibrationBlinks; }, [calibrationBlinks]);
  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);

  const {
    isBlinking,
    blinkCount,
    headDirection,
    isReady,
    isLoading,
    earValue,
    startTracking: startFaceMesh,
    stopTracking: stopFaceMesh,
  } = useEyeBlinkDetection({
    earThreshold: 0.20,
    minBlinkFrames: 2,
    blinkCooldownMs: 600,
    headSensitivity: 0.03,
  });

  // Voice feedback helper
  const announce = useCallback(async (text: string) => {
    speak(text);
    if (lang !== "en-ZA") {
      try {
        const translated = await translateText(text, lang);
        setTimeout(() => speak(translated, lang), 1500);
      } catch { /* ignore translation errors */ }
    }
  }, [lang, speak]);

  // ===== BLINK HANDLER =====
  // Track blinkCount changes to detect blinks (avoids stale closure issues)
  const prevBlinkCountRef = useRef(0);

  useEffect(() => {
    if (blinkCount === 0 || blinkCount === prevBlinkCountRef.current) return;
    prevBlinkCountRef.current = blinkCount;

    if (!isTrackingRef.current) return;

    // Visual flash
    setBlinkFlash(true);
    setTimeout(() => setBlinkFlash(false), 350);

    if (!isCalibratedRef.current) {
      // Calibration mode
      const nextCal = calibrationBlinksRef.current + 1;
      setCalibrationBlinks(nextCal);
      if (nextCal >= 3) {
        setIsCalibrated(true);
        announce("Calibration complete! Move your head to navigate. Blink to select.");
      } else {
        announce(`Calibration: ${nextCal} of 3. Blink again.`);
      }
      return;
    }

    // Post-calibration: blink = select focused button
    const idx = focusedIndexRef.current;
    const targetButton = NAV_BUTTONS[idx];
    if (targetButton) {
      announce(`Selecting: ${targetButton.label}`);
      setTimeout(() => {
        navigate(targetButton.path);
      }, 600);
    }
  }, [blinkCount, announce, navigate]);

  // ===== HEAD DIRECTION HANDLER =====
  useEffect(() => {
    if (!isTrackingRef.current || !isCalibratedRef.current) return;
    if (headDirection === prevDirectionRef.current) return;

    prevDirectionRef.current = headDirection;

    if (headDirection === "Left") {
      setFocusedIndex((prev) => Math.max(0, prev - 1));
      setCursorPos(prev => ({ ...prev, x: Math.max(0, prev.x - 10) }));
    } else if (headDirection === "Right") {
      setFocusedIndex((prev) => Math.min(NAV_BUTTONS.length - 1, prev + 1));
      setCursorPos(prev => ({ ...prev, x: Math.min(100, prev.x + 10) }));
    } else if (headDirection === "Up") {
      setCursorPos(prev => ({ ...prev, y: Math.max(0, prev.y - 10) }));
      window.scrollBy({ top: -200, behavior: "smooth" });
    } else if (headDirection === "Down") {
      setCursorPos(prev => ({ ...prev, y: Math.min(100, prev.y + 10) }));
      window.scrollBy({ top: 200, behavior: "smooth" });
    }
  }, [headDirection]);

  // ===== STATUS UPDATES =====
  useEffect(() => {
    if (isLoading && isTracking) setStatus("Loading Model");
    else if (isReady && isTracking) setStatus("Tracking Active");
    else if (!isTracking) setStatus("Camera Off");
  }, [isLoading, isReady, isTracking]);

  // ===== KEYBOARD FALLBACK =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTrackingRef.current) return;

      switch (e.key.toLowerCase()) {
        case "b": {
          // Simulate blink
          setBlinkFlash(true);
          setTimeout(() => setBlinkFlash(false), 350);

          if (!isCalibratedRef.current) {
            const nextCal = calibrationBlinksRef.current + 1;
            setCalibrationBlinks(nextCal);
            if (nextCal >= 3) {
              setIsCalibrated(true);
              announce("Calibration complete via keyboard.");
            } else {
              announce(`Step ${nextCal} of 3. Press B again.`);
            }
          } else {
            const idx = focusedIndexRef.current;
            const targetButton = NAV_BUTTONS[idx];
            if (targetButton) {
              announce(`Navigating to ${targetButton.label}`);
              setTimeout(() => navigate(targetButton.path), 500);
            }
          }
          break;
        }
        case "arrowleft":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(0, prev - 1));
          setCursorPos(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
          break;
        case "arrowright":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(NAV_BUTTONS.length - 1, prev + 1));
          setCursorPos(prev => ({ ...prev, x: Math.min(100, prev.x + 5) }));
          break;
        case "arrowup":
          e.preventDefault();
          window.scrollBy({ top: -150, behavior: "smooth" });
          setCursorPos(prev => ({ ...prev, y: Math.max(0, prev.y - 5) }));
          break;
        case "arrowdown":
          e.preventDefault();
          window.scrollBy({ top: 150, behavior: "smooth" });
          setCursorPos(prev => ({ ...prev, y: Math.min(100, prev.y + 5) }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announce, navigate]);

  // ===== TOGGLE TRACKING =====
  const toggleTracking = async () => {
    if (isTracking) {
      stopFaceMesh();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsTracking(false);
      setIsCalibrated(false);
      setCalibrationBlinks(0);
      setStatus("Camera Off");
      prevBlinkCountRef.current = 0;
      announce("Eye tracking disabled.");
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          // Wait for the video to actually start playing
          await new Promise<void>((resolve) => {
            const v = videoRef.current!;
            const onPlaying = () => {
              v.removeEventListener("playing", onPlaying);
              resolve();
            };
            v.addEventListener("playing", onPlaying);
            v.play().catch(() => resolve());
          });
          // Now start face mesh after video is confirmed playing
          startFaceMesh(videoRef.current);
        }
        setStream(newStream);
        setIsTracking(true);
        announce("Camera active. Loading face detection model, please wait.");
      } catch (err) {
        console.error("Error accessing webcam:", err);
        announce("Error accessing camera. Please check permissions.");
      }
    }
  };

  // EAR bar color
  const getEarColor = (ear: number) => {
    if (ear < 0.17) return "#FF4444";
    if (ear < 0.22) return "#FFaa00";
    return "#00FFFF";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FFFF]/30 pt-32 pb-20 px-6 overflow-x-hidden">
      {/* Gaze Cursor */}
      {isTracking && isCalibrated && (
        <motion.div 
          animate={{ x: `${cursorPos.x}vw`, y: `${cursorPos.y}vh` }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999]"
        >
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-[#00FFFF]/20 rounded-full blur-md" />
            <div className="absolute inset-2 border-2 border-[#00FFFF] rounded-full" />
            <div className="absolute inset-[40%] bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF]" />
          </div>
        </motion.div>
      )}

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/40 hover:text-[#00FFFF] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Terminal
          </Link>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white/60 hover:text-white">
                <Languages className="w-4 h-4 mr-2" />
                {LANGUAGES[lang]}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#151619] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100]">
                {(Object.keys(LANGUAGES) as SALanguage[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors ${
                      lang === l ? "text-[#00FFFF]" : "text-white/60"
                    }`}
                  >
                    {LANGUAGES[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#00FFFF]/20 border border-[#00FFFF]/40 flex items-center justify-center">
                <Eye className="w-8 h-8 text-[#00FFFF]" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                Eye Control <br />
                <span className="text-[#00FFFF]">Zero Touch</span>
              </h1>
              <p className="text-xl text-white/50 max-w-2xl leading-relaxed">
                Truly hands-free navigation powered by <span className="text-white font-semibold">MediaPipe Face Mesh</span>. 
                Real-time blink detection and head pose estimation — no keyboard needed.
              </p>
            </div>

            {/* Controls Panel */}
            <div className="p-8 bg-[#151619] rounded-3xl border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    status === "Tracking Active" 
                      ? "bg-[#00FFFF] shadow-[0_0_10px_#00FFFF]" 
                      : status === "Loading Model" 
                        ? "bg-yellow-400 shadow-[0_0_10px_#FFaa00] animate-pulse"
                        : "bg-white/20"
                  }`} />
                  <span className="font-mono text-sm uppercase tracking-wider">{status}</span>
                </div>
                <Button 
                  onClick={toggleTracking}
                  variant={isTracking ? "outline" : "primary"}
                  className={isTracking ? "border-red-500/50 text-red-500 hover:bg-red-500/10" : "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80"}
                >
                  {isTracking ? <CameraOff className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  {isTracking ? "Disable Tracking" : "Enable Eye Tracking"}
                </Button>
              </div>

              {/* Loading state */}
              {isLoading && isTracking && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-4">
                  <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                  <div>
                    <p className="text-sm font-bold text-yellow-400">LOADING FACE MESH MODEL</p>
                    <p className="text-xs text-yellow-400/60 mt-1">Downloading neural network (~4MB)... One-time download.</p>
                  </div>
                </motion.div>
              )}

              {/* Calibration prompt */}
              {!isCalibrated && isTracking && isReady && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-[#00FFFF]/10 border border-[#00FFFF]/20 rounded-2xl flex items-center gap-4">
                  <RefreshCw className="w-5 h-5 text-[#00FFFF] animate-spin" />
                  <div>
                    <p className="text-sm font-bold text-[#00FFFF]">
                      CALIBRATION: Blink {3 - calibrationBlinks} more time{3 - calibrationBlinks !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-[#00FFFF]/60 mt-1">Look at the camera and blink deliberately (close both eyes for a moment).</p>
                    <div className="flex gap-2 mt-2">
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          i < calibrationBlinks 
                            ? "bg-[#00FFFF] shadow-[0_0_8px_#00FFFF]" 
                            : "bg-white/10 border border-white/20"}`} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Calibrated */}
              {isCalibrated && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-bold text-green-500 uppercase tracking-widest">System Calibrated & Active</p>
                    <p className="text-xs text-green-500/60 mt-1">Move head to navigate • Blink to select</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Live Telemetry */}
            {isTracking && isReady && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-[#00FFFF]">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Live Telemetry</span>
                </div>

                {/* EAR Meter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Eye Aspect Ratio</span>
                    <span className="text-sm font-mono font-bold" style={{ color: getEarColor(earValue) }}>
                      {earValue.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${Math.min(100, (earValue / 0.4) * 100)}%` }}
                      transition={{ duration: 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getEarColor(earValue) }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-white/20">
                    <span>CLOSED (0.00)</span>
                    <span className="text-yellow-500/50">THRESHOLD (0.20)</span>
                    <span>OPEN (0.40)</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#00FFFF]">{blinkCount}</p>
                    <p className="text-[9px] font-mono text-white/30 uppercase mt-1">Blinks</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className={`text-lg font-black ${headDirection !== "Center" ? "text-[#00FFFF]" : "text-white/40"}`}>
                      {headDirection}
                    </p>
                    <p className="text-[9px] font-mono text-white/30 uppercase mt-1">Direction</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center">
                    <p className={`text-2xl font-black ${isCalibrated ? "text-green-500" : "text-yellow-400"}`}>
                      {isCalibrated ? "ON" : "CAL"}
                    </p>
                    <p className="text-[9px] font-mono text-white/30 uppercase mt-1">Status</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Interaction Guide */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-[#00FFFF]">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Blink</span>
                </div>
                <p className="text-sm text-white/40">Close both eyes briefly to select the focused item.</p>
                <p className="text-[9px] font-mono text-white/20 mt-2">Fallback: Press B key</p>
              </div>
              <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-[#00FFFF]">
                  <MousePointer2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Head Move</span>
                </div>
                <p className="text-sm text-white/40">Turn head left/right to cycle items, up/down to scroll.</p>
                <p className="text-[9px] font-mono text-white/20 mt-2">Fallback: Arrow keys</p>
              </div>
            </div>
          </div>

          {/* Right Column: Camera & Nav */}
          <div className="space-y-6 sticky top-32">
            {/* Camera Feed */}
            <div className="relative aspect-video bg-black rounded-[40px] overflow-hidden border-2 border-white/10 shadow-2xl group">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              
              {/* Camera off placeholder */}
              {!isTracking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0c]">
                  <Scan className="w-16 h-16 text-white/10 mb-4" />
                  <p className="text-sm font-mono text-white/20 uppercase tracking-widest">Camera Off</p>
                  <p className="text-xs text-white/10 mt-2">Click "Enable Eye Tracking" to begin</p>
                </div>
              )}

              {/* Face tracking box overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isTracking && isReady && (
                  <motion.div 
                    animate={{ 
                      x: headDirection === "Left" ? -40 : headDirection === "Right" ? 40 : 0,
                      y: headDirection === "Up" ? -40 : headDirection === "Down" ? 40 : 0,
                    }}
                    transition={{ type: "spring", damping: 15, stiffness: 80 }}
                    className="w-48 h-48 border-2 border-[#00FFFF]/50 rounded-3xl flex items-center justify-center relative"
                  >
                    <div className="w-2 h-2 bg-[#00FFFF] rounded-full" />
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00FFFF]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00FFFF]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00FFFF]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00FFFF]" />
                  </motion.div>
                )}

                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 text-[#00FFFF] animate-spin mb-3" />
                    <p className="text-xs font-mono text-[#00FFFF] uppercase tracking-widest">Initializing Face Mesh</p>
                  </div>
                )}
              </div>

              {/* HUD bottom bar */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <AnimatePresence>
                  {blinkFlash && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="px-4 py-2 bg-[#00FFFF] text-black font-black text-xs uppercase tracking-[0.2em] rounded-full shadow-[0_0_20px_#00FFFF]"
                    >
                      👁️ Blink Detected!
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {isTracking && isReady && (
                  <div className="px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-3 ml-auto">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Dir:</span>
                    <span className={`text-[10px] font-mono uppercase font-bold ${headDirection !== "Center" ? "text-[#00FFFF]" : "text-white/30"}`}>
                      {headDirection}
                    </span>
                    <span className="text-[10px] font-mono text-white/20">|</span>
                    <span className="text-[10px] font-mono text-white/40 uppercase">EAR:</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: getEarColor(earValue) }}>
                      {earValue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Top-left badge */}
              {isTracking && isReady && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-[#00FFFF]/30 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00FFFF] rounded-full animate-pulse" />
                  <span className="text-[9px] font-mono text-[#00FFFF] uppercase tracking-wider font-bold">MediaPipe Active</span>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/30 px-4">
                Navigation Menu {isCalibrated && "— Blink to Select"}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {NAV_BUTTONS.map((btn, idx) => (
                  <motion.div
                    key={btn.label}
                    animate={{ 
                      scale: focusedIndex === idx ? 1.02 : 1,
                      x: focusedIndex === idx ? 10 : 0
                    }}
                    className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group cursor-pointer ${
                      focusedIndex === idx 
                        ? "bg-[#00FFFF]/10 border-[#00FFFF] shadow-[0_0_30px_rgba(0,255,255,0.1)]" 
                        : "bg-[#151619] border-white/5 hover:border-white/10"
                    }`}
                    onClick={() => navigate(btn.path)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        focusedIndex === idx ? "bg-[#00FFFF] text-black" : "bg-white/5 text-white/40"
                      }`}>
                        {idx === 0 && <ShieldCheck className="w-5 h-5" />}
                        {idx === 1 && <Eye className="w-5 h-5" />}
                        {idx === 2 && <Zap className="w-5 h-5" />}
                        {idx === 3 && <ArrowLeft className="w-5 h-5" />}
                      </div>
                      <span className={`text-lg font-bold transition-colors ${
                        focusedIndex === idx ? "text-[#00FFFF]" : "text-white/60"
                      }`}>
                        {btn.label}
                      </span>
                    </div>
                    {focusedIndex === idx && isCalibrated && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#00FFFF] uppercase animate-pulse">Blink to Select</span>
                        <ChevronRight className="w-5 h-5 text-[#00FFFF]" />
                      </div>
                    )}
                    {focusedIndex === idx && !isCalibrated && isTracking && (
                      <span className="text-[10px] font-mono text-white/30 uppercase">Calibrate First</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack Section */}
        <div className="p-12 bg-[#151619] rounded-[40px] border border-white/5">
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-tighter">Technology Stack</h2>
            <p className="text-white/40 leading-relaxed">
              Powered by <span className="text-white">MediaPipe Face Mesh</span> with 468 facial landmarks, 
              computing <span className="text-white">Eye Aspect Ratio (EAR)</span> for blink detection and 
              <span className="text-white"> head pose estimation</span> for directional control.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                { title: "Blink Detection", desc: "EAR from 6 landmarks per eye. Detects natural blinks with frame-level precision." },
                { title: "Head Pose Estimation", desc: "Yaw/pitch from nose, forehead, chin, cheek landmarks → Up/Down/Left/Right." },
                { title: "Gaze Cursor", desc: "Virtual cursor tracks head position with spring physics for smooth visual feedback." },
              ].map(item => (
                <div key={item.title} className="space-y-2 p-4 rounded-2xl bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <h4 className="text-green-400 font-bold text-sm">{item.title}</h4>
                  </div>
                  <p className="text-xs text-white/30">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Direction Indicators */}
      <div className="fixed bottom-8 right-8 flex flex-col items-center gap-2 pointer-events-none opacity-30">
        <ChevronUp className={`w-8 h-8 transition-all ${headDirection === "Up" ? "text-[#00FFFF] opacity-100 scale-125" : "text-white"}`} />
        <div className="flex gap-2">
          <ChevronLeft className={`w-8 h-8 transition-all ${headDirection === "Left" ? "text-[#00FFFF] opacity-100 scale-125" : "text-white"}`} />
          <div className={`w-8 h-8 rounded-full border-2 transition-all ${headDirection === "Center" ? "border-[#00FFFF] bg-[#00FFFF]/20" : "border-white/20"}`} />
          <ChevronRight className={`w-8 h-8 transition-all ${headDirection === "Right" ? "text-[#00FFFF] opacity-100 scale-125" : "text-white"}`} />
        </div>
        <ChevronDown className={`w-8 h-8 transition-all ${headDirection === "Down" ? "text-[#00FFFF] opacity-100 scale-125" : "text-white"}`} />
      </div>
    </div>
  );
}
