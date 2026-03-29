import type { Handedness, NormalizedLandmarkList, Results } from "@mediapipe/hands";

type FingerState = "extended" | "curled" | "partial";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface HandSummary {
  handedness: Handedness["label"] | "Unknown";
  confidence: number;
  center: { x: number; y: number };
  openness: number;
  pinch: boolean;
  spread: number;
  fingerStates: Record<"thumb" | "index" | "middle" | "ring" | "pinky", FingerState>;
  poseHints: string[];
  landmarks: Point3D[];
}

export interface GestureFrame {
  tMs: number;
  hands: HandSummary[];
}

export interface GestureRecognitionPayload {
  observationWindowMs: number;
  frameCount: number;
  currentFrame: GestureFrame | null;
  recentFrames: GestureFrame[];
  motionSummary: {
    centerTravel: number;
    fingertipTravel: number;
    pattern: "static" | "dynamic";
  };
  candidateLabels: string[];
}

const round = (value: number) => Number(value.toFixed(4));

const distance = (a: Point3D, b: Point3D) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

function averagePoint(points: Point3D[]) {
  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y, z: acc.z + point.z }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: round(total.x / points.length),
    y: round(total.y / points.length),
    z: round(total.z / points.length),
  };
}

function palmScale(hand: Point3D[]) {
  const wrist = hand[0];
  const indexMcp = hand[5];
  const pinkyMcp = hand[17];
  if (!wrist || !indexMcp || !pinkyMcp) return 0.12;
  return Math.max(0.06, (distance(wrist, indexMcp) + distance(wrist, pinkyMcp)) / 2);
}

function fingerState(hand: Point3D[], tipIndex: number, pipIndex: number, mcpIndex: number): FingerState {
  const wrist = hand[0];
  const tip = hand[tipIndex];
  const pip = hand[pipIndex];
  const mcp = hand[mcpIndex];
  if (!wrist || !tip || !pip || !mcp) return "partial";

  const tipDist = distance(wrist, tip);
  const pipDist = distance(wrist, pip);
  const extendedByDistance = tipDist > pipDist * 1.12;
  const extendedByHeight = tip.y < pip.y && pip.y < mcp.y;
  const curledByDistance = tipDist < pipDist * 1.03;
  const curledByHeight = tip.y > pip.y;

  if (extendedByDistance && extendedByHeight) return "extended";
  if (curledByDistance || curledByHeight) return "curled";
  return "partial";
}

function thumbState(hand: Point3D[]): FingerState {
  const wrist = hand[0];
  const mcp = hand[2];
  const ip = hand[3];
  const tip = hand[4];
  if (!wrist || !mcp || !ip || !tip) return "partial";

  const palm = palmScale(hand);
  const thumbReach = distance(mcp, tip) / palm;
  const lateralMove = Math.abs(tip.x - ip.x);

  if (thumbReach > 1.05 && lateralMove > 0.03) return "extended";
  if (thumbReach < 0.72) return "curled";
  return "partial";
}

function inferPoseHints(fingerStates: HandSummary["fingerStates"], openness: number, pinch: boolean) {
  const extendedCount = Object.values(fingerStates).filter((state) => state === "extended").length;
  const hints: string[] = [];

  if (extendedCount >= 4 && openness > 1.6) hints.push("open-palm");
  if (extendedCount === 0 || Object.values(fingerStates).every((state) => state === "curled")) hints.push("closed-fist");
  if (fingerStates.index === "extended" && fingerStates.middle === "curled" && fingerStates.ring === "curled" && fingerStates.pinky === "curled") {
    hints.push("pointing-index");
  }
  if (fingerStates.index === "extended" && fingerStates.middle === "extended" && fingerStates.ring === "curled" && fingerStates.pinky === "curled") {
    hints.push("v-shape");
  }
  if (fingerStates.index === "extended" && fingerStates.middle === "extended" && fingerStates.ring === "extended" && fingerStates.pinky === "curled") {
    hints.push("w-shape");
  }
  if (fingerStates.thumb === "extended" && fingerStates.index === "extended" && fingerStates.middle === "curled" && fingerStates.ring === "curled" && fingerStates.pinky === "curled") {
    hints.push("l-shape");
  }
  if (fingerStates.thumb === "extended" && fingerStates.pinky === "extended" && fingerStates.index === "curled" && fingerStates.middle === "curled" && fingerStates.ring === "curled") {
    hints.push("y-shape");
  }
  if (pinch) hints.push("pinch");
  if (openness > 1.1 && openness < 1.5) hints.push("curved-c");

  return hints;
}

function summariseHand(hand: NormalizedLandmarkList, handedness?: Handedness): HandSummary {
  const landmarks = hand.map((point) => ({
    x: round(point.x),
    y: round(point.y),
    z: round(point.z),
  }));

  const center = averagePoint(landmarks);
  const palm = palmScale(landmarks);
  const openness =
    (distance(landmarks[0], landmarks[8]) +
      distance(landmarks[0], landmarks[12]) +
      distance(landmarks[0], landmarks[16]) +
      distance(landmarks[0], landmarks[20])) /
    (4 * palm);
  const pinch = distance(landmarks[4], landmarks[8]) < palm * 0.55;
  const spread = distance(landmarks[8], landmarks[20]) / palm;

  const fingerStates = {
    thumb: thumbState(landmarks),
    index: fingerState(landmarks, 8, 6, 5),
    middle: fingerState(landmarks, 12, 10, 9),
    ring: fingerState(landmarks, 16, 14, 13),
    pinky: fingerState(landmarks, 20, 18, 17),
  };

  return {
    handedness: handedness?.label ?? "Unknown",
    confidence: round(handedness?.score ?? 0),
    center: { x: round(center.x), y: round(center.y) },
    openness: round(openness),
    pinch,
    spread: round(spread),
    fingerStates,
    poseHints: inferPoseHints(fingerStates, openness, pinch),
    landmarks,
  };
}

export function buildGestureFrame(results: Results, timestamp: number): GestureFrame | null {
  if (!results.multiHandLandmarks?.length) return null;

  return {
    tMs: timestamp,
    hands: results.multiHandLandmarks.map((hand, index) =>
      summariseHand(hand, results.multiHandedness?.find((candidate) => candidate.index === index))
    ),
  };
}

function motionSummary(frames: GestureFrame[]) {
  if (frames.length < 2) {
    return { centerTravel: 0, fingertipTravel: 0, pattern: "static" as const };
  }

  const first = frames[0]?.hands[0];
  const last = frames[frames.length - 1]?.hands[0];
  if (!first || !last) {
    return { centerTravel: 0, fingertipTravel: 0, pattern: "static" as const };
  }

  const centerTravel = Math.hypot(last.center.x - first.center.x, last.center.y - first.center.y);
  const tipIndexes = [4, 8, 12, 16, 20];
  const fingertipTravel =
    tipIndexes.reduce((sum, tipIndex) => sum + distance(first.landmarks[tipIndex], last.landmarks[tipIndex]), 0) /
    tipIndexes.length;

  return {
    centerTravel: round(centerTravel),
    fingertipTravel: round(fingertipTravel),
    pattern: centerTravel > 0.08 || fingertipTravel > 0.1 ? ("dynamic" as const) : ("static" as const),
  };
}

function candidateLabels(frames: GestureFrame[]) {
  const candidates = new Set<string>();
  const current = frames[frames.length - 1]?.hands[0];
  const motion = motionSummary(frames);

  if (!current) return [];

  const { fingerStates, poseHints, pinch } = current;

  if (poseHints.includes("l-shape")) candidates.add("l");
  if (poseHints.includes("v-shape")) candidates.add(motion.pattern === "dynamic" ? "no" : "v");
  if (poseHints.includes("w-shape")) candidates.add("w");
  if (poseHints.includes("y-shape")) candidates.add("y");
  if (poseHints.includes("curved-c")) candidates.add("c");
  if (poseHints.includes("open-palm")) {
    candidates.add(motion.pattern === "dynamic" ? "hello" : "stop");
    candidates.add("b");
  }
  if (poseHints.includes("pointing-index")) candidates.add("d");
  if (pinch) candidates.add("f");

  if (poseHints.includes("closed-fist")) {
    candidates.add(motion.pattern === "dynamic" ? "yes" : "a");
    candidates.add("s");
  }

  if (fingerStates.pinky === "extended" && fingerStates.index !== "extended") {
    candidates.add("i");
  }

  if (fingerStates.thumb === "extended" && fingerStates.index === "curled" && fingerStates.middle === "curled" && fingerStates.ring === "curled" && fingerStates.pinky === "curled") {
    candidates.add("thumbs-up");
  }

  return [...candidates];
}

export function buildGestureRecognitionPayload(frames: GestureFrame[]): GestureRecognitionPayload {
  const trimmedFrames = frames.slice(-6);
  const windowMs =
    trimmedFrames.length > 1 ? trimmedFrames[trimmedFrames.length - 1].tMs - trimmedFrames[0].tMs : 0;

  return {
    observationWindowMs: windowMs,
    frameCount: trimmedFrames.length,
    currentFrame: trimmedFrames[trimmedFrames.length - 1] ?? null,
    recentFrames: trimmedFrames,
    motionSummary: motionSummary(trimmedFrames),
    candidateLabels: candidateLabels(trimmedFrames),
  };
}
