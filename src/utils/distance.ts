import { OBJECT_WIDTHS, FOCAL_LENGTH } from "../types";

/**
 * Estimates distance in meters based on bounding box width.
 * Formula: distance = (real_width * focal_length) / pixel_width
 */
export function estimateDistance(className: string, pixelWidth: number): number {
  const realWidth = OBJECT_WIDTHS[className] || 0.5; // Default to 0.5m if unknown
  return (realWidth * FOCAL_LENGTH) / pixelWidth;
}
