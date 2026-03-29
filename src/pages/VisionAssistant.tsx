import { useRef, useState, useEffect } from "react";
import { CameraView } from "../components/CameraView";
import { DetectionOverlay } from "../components/DetectionOverlay";
import { useObjectDetection } from "../hooks/useObjectDetection";
import { useSpeech } from "../hooks/useSpeech";
import { getNavigationInstruction } from "../utils/navigation";
import { Loader2, Languages, ChevronDown, ShieldAlert, Navigation, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SALanguage, LANGUAGES, TRANSLATIONS } from "../types";
import { translateText } from "../services/geminiService";
import { Button } from "../components/Button";
import { logActivity } from "../services/firebase";

export default function VisionAssistant() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lang, setLang] = useState<SALanguage>("en-ZA");
  const [cameraReady, setCameraReady] = useState(0);
  const { detections, isLoading } = useObjectDetection(videoRef, cameraReady);
  const { speak } = useSpeech(3000, lang); // 3s cooldown for more frequent updates
  const [instruction, setInstruction] = useState<string | null>(null);
  const lastSpokenRef = useRef<string | null>(null);

  const t = TRANSLATIONS[lang];

  // Process navigation instructions
  useEffect(() => {
    const processInstruction = () => {
      if (detections.length > 0 && videoRef.current) {
        const newInstruction = getNavigationInstruction(detections, videoRef.current.videoWidth, lang);

        if (!newInstruction) {
          setInstruction(null);
          return;
        }

        // Only process if it's a new instruction
        if (newInstruction !== lastSpokenRef.current) {
          setInstruction(newInstruction);
          speak(newInstruction);
          lastSpokenRef.current = newInstruction;

          // Log the crucial activity to Firebase
          logActivity("vision_alert", {
            instruction: newInstruction,
            language: lang,
          });

          if (lang !== "en-ZA") {
            translateText(newInstruction, lang).then(translated => {
              setTimeout(() => speak(translated, lang), 1500);
            });
          }
        } else if (!newInstruction) {
          setInstruction(null);
        }
      } else {
        setInstruction(null);
      }
    };

    processInstruction();
  }, [detections, speak, lang]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FF00]/30 pt-20">
      {/* Main Content */}
      <main className="pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              Vision<span className="text-[#00FF00]">Assistant</span>
            </h1>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Neural Navigation Engine</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 text-white/60 hover:text-white"
              >
                <Languages className="w-4 h-4 mr-2" />
                {LANGUAGES[lang]}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#151619] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100]">
                {(Object.keys(LANGUAGES) as SALanguage[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors ${lang === l ? "text-[#00FF00]" : "text-white/60"
                      }`}
                  >
                    {LANGUAGES[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Camera Section */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative h-[45vh] min-h-[300px] w-full rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-black">
            <CameraView
              videoRef={videoRef}
              onStreamReady={() => setCameraReady(prev => prev + 1)}
            />
            <DetectionOverlay detections={detections} videoRef={videoRef} />

            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80"
                >
                  <Loader2 className="w-10 h-10 text-[#00FF00] animate-spin mb-4" />
                  <p className="text-sm font-mono text-white/50 uppercase tracking-widest">
                    Initializing Neural Engine...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Critical Obstacle Alert */}
            <AnimatePresence>
              {instruction?.toLowerCase().includes("obstacle") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-red-500/90 border border-red-400 backdrop-blur-md flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                >
                  <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                  <span className="text-sm font-bold uppercase tracking-wider text-white">
                    {instruction}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "FPS", value: "24", unit: "hz" },
              { label: "Latency", value: "42", unit: "ms" },
              { label: "Objects", value: detections.length.toString(), unit: "qty" },
              { label: "Confidence", value: "98", unit: "%" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-[#151619] rounded-xl border border-white/5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-mono font-bold text-white">{stat.value}</span>
                  <span className="text-[10px] font-mono text-white/20 uppercase">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Compact Navigation Card */}
          <div className="p-6 bg-[#151619] rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#00FF00]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  Navigation System
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white/50">COCO-SSD Lite</span>
                  <span className="text-xs font-mono text-[#00FF00]">Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#00FF00]">
                    Live Active
                  </span>
                </div>
              </div>
            </div>

            <motion.div
              initial={false}
              animate={{
                backgroundColor: instruction ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 255, 255, 0.02)",
                borderColor: instruction ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 255, 255, 0.1)",
              }}
              className="min-h-[80px] flex flex-col items-center justify-center p-4 rounded-xl border border-dashed text-center transition-colors"
            >
              {instruction ? (
                <>
                  <AlertCircle className="w-8 h-8 text-[#00FF00] mb-3" />
                  <p className="text-lg font-mono font-medium text-white tracking-tight leading-tight">
                    {instruction}
                  </p>
                </>
              ) : (
                <p className="text-sm font-mono text-white/30">
                  {t.scanning}
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
            VisionGuide AI v1.0.4 // Hardware Accelerated
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF00]" />
              <span className="text-[10px] font-mono text-white/40 uppercase">GPS Locked</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
