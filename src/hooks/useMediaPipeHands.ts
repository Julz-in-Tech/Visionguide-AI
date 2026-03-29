import React, { useEffect, useRef, useState } from "react";
import { Hands, Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export const useMediaPipeHands = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const [results, setResults] = useState<Results | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    let isMounted = true;
    let hands: Hands | null = null;

    const initHands = async () => {
      try {
        hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((res) => {
          if (!isMounted) return;
          setResults(res);
          setIsLoading(false);
        });

        handsRef.current = hands;

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (handsRef.current && videoRef.current && isMounted) {
                try {
                  await handsRef.current.send({ image: videoRef.current });
                } catch (e) {
                  // Ignore frame processing errors during shutdown
                }
              }
            },
            width: 640,
            height: 360,
          });
          
          camera.start();
          cameraRef.current = camera;
        }
      } catch (error) {
        console.error("MediaPipe initialization error:", error);
      }
    };

    initHands();

    return () => {
      isMounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (hands) {
        hands.close();
        handsRef.current = null;
      }
    };
  }, [videoRef]);

  return { results, isLoading };
};
