import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { DetectedObject } from "../types";
import { estimateDistance } from "../utils/distance";

/**
 * Hook for loading and running the coco-ssd model.
 */
export function useObjectDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  trigger: any = null
) {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestRef = useRef<number>(null);

  // Load model on mount
  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load({
          base: "lite_mobilenet_v2", // Faster for real-time
        });
        setModel(loadedModel);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load model:", error);
      }
    }
    loadModel();
  }, []);

  // Detection loop
  useEffect(() => {
    if (!model || !videoRef.current) return;

    let isMounted = true;
    const detect = async () => {
      if (!isMounted) return;

      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const predictions = await model.detect(video);

        const processedDetections: DetectedObject[] = predictions.map(pred => ({
          bbox: pred.bbox as [number, number, number, number],
          class: pred.class,
          score: pred.score,
          distance: estimateDistance(pred.class, pred.bbox[2]), // pred.bbox[2] is width
        }));

        setDetections(processedDetections);
      }
      
      // Throttle to ~10fps to save CPU and prevent update depth issues
      setTimeout(() => {
        if (isMounted) {
          requestRef.current = requestAnimationFrame(detect);
        }
      }, 100);
    };

    detect();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [model, videoRef, trigger]); // Added trigger to dependencies

  return { detections, isLoading };
}
