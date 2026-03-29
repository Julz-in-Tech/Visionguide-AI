import { useEffect, useRef, useState, useCallback } from "react";
import { FaceMesh, Results as FaceMeshResults } from "@mediapipe/face_mesh";

export type HeadDirection = "Center" | "Left" | "Right" | "Up" | "Down";

interface EyeBlinkDetectionOptions {
  /** EAR threshold below which an eye is considered closed. Default: 0.20 */
  earThreshold?: number;
  /** Minimum consecutive low-EAR frames to register a blink. Default: 2 */
  minBlinkFrames?: number;
  /** Cooldown in ms between blink events. Default: 600 */
  blinkCooldownMs?: number;
  /** Head direction sensitivity in normalized coordinates. Default: 0.03 */
  headSensitivity?: number;
}

interface EyeBlinkDetectionReturn {
  isBlinking: boolean;
  blinkCount: number;
  headDirection: HeadDirection;
  isReady: boolean;
  isLoading: boolean;
  earValue: number;
  startTracking: (videoEl: HTMLVideoElement) => void;
  stopTracking: () => void;
}

// ----- Landmark indices for EAR calculation -----
const LEFT_EYE = { p1: 33, p2: 160, p3: 158, p4: 133, p5: 153, p6: 144 };
const RIGHT_EYE = { p1: 362, p2: 385, p3: 387, p4: 263, p5: 373, p6: 380 };

// Head pose landmarks
const NOSE_TIP = 1;
const FOREHEAD = 10;
const CHIN = 152;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

function euclidean(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeEAR(
  landmarks: { x: number; y: number; z: number }[],
  eye: typeof LEFT_EYE
): number {
  const p1 = landmarks[eye.p1];
  const p2 = landmarks[eye.p2];
  const p3 = landmarks[eye.p3];
  const p4 = landmarks[eye.p4];
  const p5 = landmarks[eye.p5];
  const p6 = landmarks[eye.p6];

  const vertical1 = euclidean(p2, p6);
  const vertical2 = euclidean(p3, p5);
  const horizontal = euclidean(p1, p4);

  if (horizontal === 0) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

function computeHeadDirection(
  landmarks: { x: number; y: number; z: number }[],
  sensitivity: number
): HeadDirection {
  const nose = landmarks[NOSE_TIP];
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];
  const leftCheek = landmarks[LEFT_CHEEK];
  const rightCheek = landmarks[RIGHT_CHEEK];

  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceCenterY = (forehead.y + chin.y) / 2;

  const yaw = nose.x - faceCenterX;
  const pitch = nose.y - faceCenterY;

  if (Math.abs(yaw) > Math.abs(pitch)) {
    if (yaw < -sensitivity) return "Left";
    if (yaw > sensitivity) return "Right";
  } else {
    if (pitch < -sensitivity) return "Up";
    if (pitch > sensitivity) return "Down";
  }

  return "Center";
}

export function useEyeBlinkDetection(
  options: EyeBlinkDetectionOptions = {}
): EyeBlinkDetectionReturn {
  const {
    earThreshold = 0.20,
    minBlinkFrames = 2,
    blinkCooldownMs = 600,
    headSensitivity = 0.03,
  } = options;

  const [isBlinking, setIsBlinking] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [headDirection, setHeadDirection] = useState<HeadDirection>("Center");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [earValue, setEarValue] = useState(0.3);

  const faceMeshRef = useRef<FaceMesh | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const lowEarFramesRef = useRef(0);
  const lastBlinkTimeRef = useRef(0);
  const isReadyRef = useRef(false);
  const activeRef = useRef(false);

  // Use refs for mutable values that the processing loop accesses,
  // avoiding the stale closure problem entirely.
  const earThresholdRef = useRef(earThreshold);
  const minBlinkFramesRef = useRef(minBlinkFrames);
  const blinkCooldownMsRef = useRef(blinkCooldownMs);
  const headSensitivityRef = useRef(headSensitivity);

  useEffect(() => { earThresholdRef.current = earThreshold; }, [earThreshold]);
  useEffect(() => { minBlinkFramesRef.current = minBlinkFrames; }, [minBlinkFrames]);
  useEffect(() => { blinkCooldownMsRef.current = blinkCooldownMs; }, [blinkCooldownMs]);
  useEffect(() => { headSensitivityRef.current = headSensitivity; }, [headSensitivity]);

  const processResults = useCallback((results: FaceMeshResults) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    // Mark as ready on first successful detection
    if (!isReadyRef.current) {
      isReadyRef.current = true;
      setIsReady(true);
      setIsLoading(false);
    }

    const landmarks = results.multiFaceLandmarks[0] as { x: number; y: number; z: number }[];

    // --- EAR computation ---
    const leftEAR = computeEAR(landmarks, LEFT_EYE);
    const rightEAR = computeEAR(landmarks, RIGHT_EYE);
    const avgEAR = (leftEAR + rightEAR) / 2;
    setEarValue(avgEAR);

    // --- Blink detection ---
    const threshold = earThresholdRef.current;
    const minFrames = minBlinkFramesRef.current;
    const cooldown = blinkCooldownMsRef.current;

    if (avgEAR < threshold) {
      lowEarFramesRef.current += 1;
    } else {
      // Eyes just opened — check if we had enough closed frames
      if (lowEarFramesRef.current >= minFrames) {
        const now = Date.now();
        if (now - lastBlinkTimeRef.current > cooldown) {
          lastBlinkTimeRef.current = now;
          setIsBlinking(true);
          setBlinkCount((prev) => prev + 1);
          // Reset blink flag after a short period
          setTimeout(() => {
            setIsBlinking(false);
          }, 350);
        }
      }
      lowEarFramesRef.current = 0;
    }

    // --- Head direction ---
    const direction = computeHeadDirection(landmarks, headSensitivityRef.current);
    // Use functional update to access previous state and prevent unnecessary re-renders
    setHeadDirection(prevDirection => {
      if (direction !== prevDirection) {
        return direction;
      }
      return prevDirection;
    });
  }, []); // No deps — uses refs for all mutable values

  const startTracking = useCallback(
    (videoEl: HTMLVideoElement) => {
      if (activeRef.current) return;
      activeRef.current = true;
      videoElRef.current = videoEl;

      setIsLoading(true);
      isReadyRef.current = false;

      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Use the stable processResults ref — no stale closure issue
      faceMesh.onResults(processResults);

      faceMeshRef.current = faceMesh;

      // Use requestAnimationFrame loop instead of Camera utility
      // for more reliable frame delivery
      const sendFrame = async () => {
        if (!activeRef.current || !faceMeshRef.current || !videoElRef.current) return;

        try {
          if (videoElRef.current.readyState >= 2) {
            await faceMeshRef.current.send({ image: videoElRef.current });
          }
        } catch (err) {
          console.warn("FaceMesh frame error:", err);
        }

        if (activeRef.current) {
          animFrameRef.current = requestAnimationFrame(sendFrame);
        }
      };

      // Wait a beat for the video to fully start, then begin the loop
      setTimeout(() => {
        if (activeRef.current) {
          animFrameRef.current = requestAnimationFrame(sendFrame);
        }
      }, 500);
    },
    [processResults]
  );

  const stopTracking = useCallback(() => {
    activeRef.current = false;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    videoElRef.current = null;
    isReadyRef.current = false;

    setIsReady(false);
    setIsLoading(false);
    setBlinkCount(0);
    setHeadDirection("Center");
    setEarValue(0.3);
    lowEarFramesRef.current = 0;
    lastBlinkTimeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isBlinking,
    blinkCount,
    headDirection,
    isReady,
    isLoading,
    earValue,
    startTracking,
    stopTracking,
  };
}
