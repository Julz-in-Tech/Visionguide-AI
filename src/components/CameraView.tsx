import React, { useRef, useEffect, useState } from "react";
import { CameraOff, AlertCircle } from "lucide-react";

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onStreamReady?: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ videoRef, onStreamReady }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setError(null);
            if (onStreamReady) onStreamReady();
          }
        } catch (err: any) {
          console.error("Error accessing camera:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Camera access was denied. Please allow camera permissions in your browser settings.");
          } else if (err.name === "NotFoundError") {
            setError("No camera found on this device.");
          } else {
            setError("Failed to access camera. Please check your hardware and try again.");
          }
        }
      } else {
        setError("Your browser does not support camera access.");
      }
    }
    setupCamera();
  }, [videoRef]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center">
      {error ? (
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <CameraOff className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-mono font-bold text-white uppercase tracking-tighter flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" /> Permission Required
            </h3>
            <p className="text-sm font-mono text-white/50 max-w-xs leading-relaxed">
              {error}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover opacity-80"
        />
      )}
    </div>
  );
};
