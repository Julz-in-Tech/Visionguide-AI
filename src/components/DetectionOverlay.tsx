import React, { useRef, useEffect } from "react";
import { DetectedObject } from "../types";

interface DetectionOverlayProps {
  detections: DetectedObject[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ detections, videoRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = videoRef.current;
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(det => {
      const [x, y, width, height] = det.bbox;
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      const rectX = x * scaleX;
      const rectY = y * scaleY;
      const rectW = width * scaleX;
      const rectH = height * scaleY;

      // Draw bounding box
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;
      ctx.strokeRect(rectX, rectY, rectW, rectH);

      // Draw label background
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      const label = `${det.class} (${(det.score * 100).toFixed(0)}%) - ${det.distance?.toFixed(1)}m`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(rectX, rectY - 20, textWidth + 10, 20);

      // Draw label text
      ctx.fillStyle = "#000000";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillText(label, rectX + 5, rectY - 5);
    });
  }, [detections, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
};
