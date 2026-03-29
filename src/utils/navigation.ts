import { DetectedObject, SALanguage } from "../types";

/**
 * Generates hardcoded navigation instructions based on COCO-SSD detections.
 * Uses object class, proximity, and screen position for spatial awareness.
 */
export function getNavigationInstruction(
  detections: DetectedObject[],
  canvasWidth: number,
  lang: SALanguage
): string | null {
  if (detections.length === 0) return null;

  // 1. Filter out low-confidence objects and sort by estimated distance (closest first)
  const relevantDetections = detections
    .filter((d) => d.score > 0.55)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  if (relevantDetections.length === 0) return null;

  const primary = relevantDetections[0];
  const [x, , width] = primary.bbox;
  const centerX = x + width / 2;
  const relativePos = centerX / canvasWidth; // 0.0 (Left) to 1.0 (Right)
  
  // Check if it's the local language (e.g., isiXhosa/isiZulu)
  const isLocal = lang !== "en-ZA";

  // 2. Proximity Threshold (using the distance calculated in useObjectDetection)
  const isCritical = (primary.distance || 10) < 1.8;

  if (isCritical) {
    // Hardcoded responses for specific high-priority obstacles from COCO dataset
    switch (primary.class) {
      case "chair":
      case "couch":
      case "bed":
        return isLocal ? "Isitulo siphambi kwakho. Khwebuka." : "Furniture detected ahead. Please go around.";
      case "person":
        return isLocal ? "Kukhona umuntu phambi kwakho." : "There is a person in your path.";
      case "potted plant":
        return isLocal ? "Qaphela isitshalo." : "Watch out for the potted plant ahead.";
      default:
        return isLocal 
          ? `Isithiyo: i-${primary.class} iseduze.` 
          : `Warning: ${primary.class} detected directly ahead.`;
    }
  }

  // 3. Directional Guidance (if object is further away but in the path)
  if (relativePos < 0.35) {
    return isLocal ? "Gudlukela kwesokudla." : "Object on your left. Move slightly right.";
  } else if (relativePos > 0.65) {
    return isLocal ? "Gudlukela kwesobunxele." : "Object on your right. Move slightly left.";
  }

  return null;
}