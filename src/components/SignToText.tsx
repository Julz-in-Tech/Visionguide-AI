import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { interpretGestures } from '../services/geminiService';
import { Loader2, Video, Volume2, AlertCircle } from 'lucide-react';
import { buildGestureFrame, buildGestureRecognitionPayload, type GestureFrame } from '../services/signRecognition';

interface SignToTextProps {
  onInterpretation?: (text: string) => void;
}

/**
 * SignToText Component
 * Integrates MediaPipe Hands with Gemini AI for real-time SASL interpretation.
 * Features a "Continuous Mode" for automatic hands-free translation.
 */
export const SignToText: React.FC<SignToTextProps> = ({ onInterpretation }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [interpretation, setInterpretation] = useState<string>('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [lastLandmarks, setLastLandmarks] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  
  const handsRef = useRef<Hands | null>(null);
  const isProcessingRef = useRef(false);
  const abortCountRef = useRef(0);
  const stabilityCounterRef = useRef(0);
  const lastInterpretationRef = useRef<string>('');
  const lastCallTimeRef = useRef<number>(0);
  const frameHistoryRef = useRef<GestureFrame[]>([]);
  const lastSampleTimeRef = useRef<number>(0);

  // Process MediaPipe results and draw landmarks on canvas
  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: '#FF00FF', // Using project's signature magenta
          lineWidth: 4,
        });
        drawLandmarks(canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 2 });
      }
      setLastLandmarks(results.multiHandLandmarks);

      const now = Date.now();
      if (now - lastSampleTimeRef.current >= 140) {
        const frame = buildGestureFrame(results, now);
        if (frame) {
          frameHistoryRef.current = [...frameHistoryRef.current, frame].slice(-6);
          lastSampleTimeRef.current = now;
        }
      }
    } else {
      setLastLandmarks(null);
      frameHistoryRef.current = [];
      lastSampleTimeRef.current = 0;
    }
    canvasCtx.restore();
  }, []);

  // Initialize MediaPipe Hands
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      if (!handsRef.current) {
        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        handsRef.current = hands;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        if (videoRef.current.readyState < 2) {
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => resolve(true);
            }
          });
        }
        setIsCameraReady(true);
      }
    } catch (err: any) {
      console.error("MediaPipe initialization failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Camera permission denied. Please check your browser settings.");
      } else {
        setCameraError("Failed to initialize AI tracking. Please check camera permissions.");
      }
      setIsCameraReady(false);
    }
  }, [onResults]);

  useEffect(() => {
    initCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initCamera]);

  // Processing loop
  useEffect(() => {
    let active = true;
    let animationFrameId: number;

    const processVideo = async () => {
      if (!active) return;

      if (isCameraReady && videoRef.current && handsRef.current && !isProcessingRef.current) {
        isProcessingRef.current = true;
        try {
          await handsRef.current.send({ image: videoRef.current });
          abortCountRef.current = 0;
        } catch (err: any) {
          if (err.message?.includes('Aborted')) {
            abortCountRef.current++;
            if (abortCountRef.current > 3) {
              setCameraError("AI processing crashed. Please refresh.");
              active = false;
            } else {
              handsRef.current = null;
              setIsCameraReady(false);
              setTimeout(() => initCamera(), 1000);
            }
          }
        } finally {
          isProcessingRef.current = false;
        }
      }
      
      if (active) animationFrameId = requestAnimationFrame(processVideo);
    };

    if (isCameraReady) {
      const timeoutId = setTimeout(processVideo, 500);
      return () => {
        clearTimeout(timeoutId);
        active = false;
        cancelAnimationFrame(animationFrameId);
      };
    }
    return () => { active = false; cancelAnimationFrame(animationFrameId); };
  }, [isCameraReady, initCamera]);

  // Manual and Auto Interpretation Logic
  const handleInterpret = useCallback(async (landmarksToUse?: any) => {
    const landmarks = landmarksToUse || lastLandmarks;
    if (!landmarks || isInterpreting) return;

    const payload = buildGestureRecognitionPayload(frameHistoryRef.current);
    if (!payload.currentFrame) return;

    const payloadSignature = JSON.stringify({
      candidateLabels: payload.candidateLabels,
      motionSummary: payload.motionSummary,
      hands: payload.currentFrame.hands.map((hand) => ({
        handedness: hand.handedness,
        fingerStates: hand.fingerStates,
        poseHints: hand.poseHints,
        pinch: hand.pinch,
      })),
    });
    if (payloadSignature === lastInterpretationRef.current) return;
    
    const now = Date.now();
    if (isAutoMode && now - lastCallTimeRef.current < 2000) return;

    setIsInterpreting(true);
    lastCallTimeRef.current = now;
    lastInterpretationRef.current = payloadSignature;

    try {
      const result = await interpretGestures(payload);
      if (result.interpretation) {
        setInterpretation(result.interpretation);
        if (onInterpretation) {
          onInterpretation(result.interpretation);
        } else {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(result.interpretation));
        }
      }
    } catch (error) {
      console.error("Interpretation error:", error);
    } finally {
      setIsInterpreting(false);
    }
  }, [lastLandmarks, isInterpreting, isAutoMode, onInterpretation]);

  // Stability Check for Auto Mode
  useEffect(() => {
    if (!isAutoMode || !lastLandmarks || isInterpreting) {
      stabilityCounterRef.current = 0;
      return;
    }
    stabilityCounterRef.current += 1;
    if (stabilityCounterRef.current >= 20) { // Approx 2 seconds of steady hands
      handleInterpret(lastLandmarks);
      stabilityCounterRef.current = 0;
    }
  }, [lastLandmarks, isAutoMode, isInterpreting, handleInterpret]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirrors the feed for more natural signing
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          width={640}
          height={480}
        />

        {!isCameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-[#FF00FF] animate-spin mb-4" />
            <p className="text-xs font-mono uppercase tracking-widest text-white/40">Initializing AI Tracking...</p>
          </div>
        )}
        
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-sm font-mono text-white/60">{cameraError}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center justify-between w-full px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-[#FF00FF] animate-pulse' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Continuous Interpretation</span>
          </div>
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAutoMode ? 'bg-[#FF00FF]' : 'bg-white/10'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <button
          onClick={() => handleInterpret()}
          disabled={isInterpreting || !lastLandmarks || !isCameraReady}
          className="w-full py-4 px-8 rounded-2xl font-mono font-bold text-xs uppercase tracking-widest bg-[#FF00FF] text-white hover:bg-[#D000D0] transition-all disabled:bg-white/5 disabled:text-white/20"
        >
          {isInterpreting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          <span className="ml-2">{isInterpreting ? 'Analyzing...' : 'Interpret Current Sign'}</span>
        </button>
      </div>
    </div>
  );
};
