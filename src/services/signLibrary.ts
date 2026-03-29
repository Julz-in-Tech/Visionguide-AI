/**
 * Local Sign Library for South African Sign Language (SASL)
 * Provides deterministic placeholder hand poses so the signing avatar
 * can still animate offline when the AI service is unavailable.
 */

export interface SignLandmark {
  x: number;
  y: number;
  z: number;
}

export type SignFrame = SignLandmark[];

type FingerCurlPattern = [number, number, number, number, number];

interface PoseSpec {
  centerX: number;
  centerY: number;
  curls: FingerCurlPattern;
  spread?: number;
  depth?: number;
}

const FINGER_X = [-0.15, -0.07, 0, 0.07, 0.15];
const FINGER_STEP = 0.055;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Number(value.toFixed(4));
const interpolate = (start: number, end: number, t: number) => start + (end - start) * t;

function createHandPose(
  centerX: number,
  centerY: number,
  curls: FingerCurlPattern,
  spread = 0,
  depth = 0
): SignFrame {
  const wrist: SignLandmark = {
    x: round(centerX),
    y: round(centerY + 0.2),
    z: round(depth),
  };

  const landmarks: SignFrame = [wrist];

  curls.forEach((curl, fingerIndex) => {
    const fingerBaseX = centerX + FINGER_X[fingerIndex] + spread * (fingerIndex - 2) * 0.03;
    const fingerBaseY = centerY + (fingerIndex === 0 ? 0.05 : 0.02);
    const fingerDepth = depth - fingerIndex * 0.01;

    for (let joint = 0; joint < 4; joint += 1) {
      const progress = (joint + 1) / 4;
      const horizontalCurl = fingerIndex === 0 ? curl * progress * 0.18 : curl * progress * 0.08;
      const verticalLift = (1 - curl * 0.65) * progress * FINGER_STEP * 4;

      landmarks.push({
        x: round(fingerBaseX + (fingerIndex === 0 ? horizontalCurl : 0)),
        y: round(fingerBaseY - verticalLift + curl * progress * 0.05),
        z: round(fingerDepth - progress * 0.03 - curl * 0.06),
      });
    }
  });

  return landmarks;
}

function interpolateFrames(from: SignFrame, to: SignFrame, steps = 2): SignFrame[] {
  const frames: SignFrame[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    frames.push(
      from.map((point, index) => ({
        x: round(interpolate(point.x, to[index]?.x ?? point.x, t)),
        y: round(interpolate(point.y, to[index]?.y ?? point.y, t)),
        z: round(interpolate(point.z, to[index]?.z ?? point.z, t)),
      }))
    );
  }

  return frames;
}

function cloneFrame(frame: SignFrame): SignFrame {
  return frame.map((point) => ({ ...point }));
}

function cloneSequence(sequence: SignFrame[]): SignFrame[] {
  return sequence.map(cloneFrame);
}

function createMotionSequence(poses: PoseSpec[]): SignFrame[] {
  return poses.map((pose) =>
    createHandPose(pose.centerX, pose.centerY, pose.curls, pose.spread ?? 0, pose.depth ?? 0)
  );
}

function composeSequence(...segments: SignFrame[][]): SignFrame[] {
  const combined: SignFrame[] = [];
  let previous: SignFrame | null = null;

  for (const segment of segments) {
    if (!segment.length) continue;

    const clonedSegment = cloneSequence(segment);
    if (previous) {
      combined.push(...interpolateFrames(previous, clonedSegment[0], 1).slice(1));
    }

    combined.push(...clonedSegment);
    previous = clonedSegment[clonedSegment.length - 1];
  }

  return combined;
}

function normalizeTextKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeWord(word: string) {
  return normalizeTextKey(word).replace(/\s+/g, "");
}

const LETTER_POSES: Record<string, SignFrame> = {
  a: createHandPose(0.48, 0.5, [0.9, 0.95, 0.95, 0.95, 0.95], -0.2, 0.02),
  b: createHandPose(0.5, 0.48, [0.8, 0.05, 0.05, 0.05, 0.05], 0.15, -0.02),
  c: createHandPose(0.52, 0.5, [0.45, 0.4, 0.4, 0.45, 0.45], 0.2, 0.02),
  d: createHandPose(0.5, 0.48, [0.75, 0.05, 0.95, 0.95, 0.95], 0.08, -0.01),
  e: createHandPose(0.5, 0.53, [0.7, 0.85, 0.85, 0.85, 0.85], -0.1, 0.04),
  f: createHandPose(0.5, 0.49, [0.2, 0.85, 0.1, 0.1, 0.1], 0.18, -0.03),
  g: createHandPose(0.58, 0.5, [0.7, 0.2, 0.2, 0.95, 0.95], 0.24, -0.04),
  h: createHandPose(0.56, 0.48, [0.8, 0.05, 0.05, 0.95, 0.95], 0.2, -0.02),
  i: createHandPose(0.48, 0.5, [0.9, 0.95, 0.95, 0.95, 0.1], -0.06, 0.03),
  j: createHandPose(0.46, 0.54, [0.9, 0.95, 0.95, 0.95, 0.1], 0.12, 0.05),
  k: createHandPose(0.52, 0.48, [0.55, 0.05, 0.05, 0.95, 0.95], 0.28, -0.03),
  l: createHandPose(0.5, 0.48, [0.05, 0.05, 0.95, 0.95, 0.95], 0.14, -0.02),
  m: createHandPose(0.5, 0.53, [0.7, 0.75, 0.78, 0.8, 0.9], 0.02, 0.03),
  n: createHandPose(0.5, 0.52, [0.7, 0.72, 0.78, 0.92, 0.95], 0, 0.03),
  o: createHandPose(0.51, 0.5, [0.35, 0.35, 0.35, 0.35, 0.35], 0.12, 0.02),
  p: createHandPose(0.55, 0.55, [0.55, 0.08, 0.08, 0.95, 0.95], 0.24, 0.03),
  q: createHandPose(0.56, 0.55, [0.75, 0.2, 0.2, 0.95, 0.95], 0.2, 0.04),
  r: createHandPose(0.52, 0.49, [0.8, 0.12, 0.12, 0.95, 0.95], 0.04, -0.03),
  s: createHandPose(0.49, 0.52, [0.85, 0.95, 0.95, 0.95, 0.95], -0.18, 0.03),
  t: createHandPose(0.5, 0.52, [0.55, 0.95, 0.95, 0.95, 0.95], -0.12, 0.02),
  u: createHandPose(0.52, 0.48, [0.82, 0.05, 0.05, 0.95, 0.95], 0.08, -0.02),
  v: createHandPose(0.52, 0.47, [0.8, 0.05, 0.05, 0.95, 0.95], 0.18, -0.02),
  w: createHandPose(0.52, 0.46, [0.8, 0.05, 0.05, 0.05, 0.95], 0.22, -0.03),
  x: createHandPose(0.5, 0.49, [0.8, 0.45, 0.95, 0.95, 0.95], 0.06, 0.01),
  y: createHandPose(0.5, 0.49, [0.05, 0.95, 0.95, 0.95, 0.05], 0.22, -0.02),
  z: createHandPose(0.54, 0.49, [0.8, 0.1, 0.95, 0.95, 0.95], 0.08, -0.04),
};

const WORD_POSES: Record<string, SignFrame[]> = {
  hello: createMotionSequence([
    { centerX: 0.44, centerY: 0.32, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.05 },
    { centerX: 0.5, centerY: 0.32, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.04 },
    { centerX: 0.58, centerY: 0.34, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.03 },
  ]),
  goodbye: createMotionSequence([
    { centerX: 0.56, centerY: 0.34, curls: [0.15, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.04 },
    { centerX: 0.48, centerY: 0.33, curls: [0.15, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.03 },
    { centerX: 0.42, centerY: 0.35, curls: [0.15, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.02 },
  ]),
  thanks: createMotionSequence([
    { centerX: 0.5, centerY: 0.38, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.03 },
    { centerX: 0.57, centerY: 0.46, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.02 },
  ]),
  please: createMotionSequence([
    { centerX: 0.5, centerY: 0.46, curls: [0.35, 0.45, 0.45, 0.45, 0.45], spread: 0.08, depth: 0.01 },
    { centerX: 0.54, centerY: 0.48, curls: [0.35, 0.45, 0.45, 0.45, 0.45], spread: 0.08, depth: 0.01 },
    { centerX: 0.48, centerY: 0.5, curls: [0.35, 0.45, 0.45, 0.45, 0.45], spread: 0.08, depth: 0.01 },
  ]),
  sorry: createMotionSequence([
    { centerX: 0.5, centerY: 0.44, curls: [0.45, 0.45, 0.45, 0.45, 0.45], spread: 0.04, depth: 0.01 },
    { centerX: 0.54, centerY: 0.47, curls: [0.45, 0.45, 0.45, 0.45, 0.45], spread: 0.04, depth: 0.02 },
    { centerX: 0.49, centerY: 0.5, curls: [0.45, 0.45, 0.45, 0.45, 0.45], spread: 0.04, depth: 0.01 },
  ]),
  yes: createMotionSequence([
    { centerX: 0.52, centerY: 0.48, curls: [0.95, 0.95, 0.95, 0.95, 0.95], spread: -0.18, depth: 0.02 },
    { centerX: 0.52, centerY: 0.54, curls: [0.95, 0.95, 0.95, 0.95, 0.95], spread: -0.18, depth: 0.05 },
    { centerX: 0.52, centerY: 0.48, curls: [0.95, 0.95, 0.95, 0.95, 0.95], spread: -0.18, depth: 0.02 },
  ]),
  no: createMotionSequence([
    { centerX: 0.52, centerY: 0.48, curls: [0.75, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
    { centerX: 0.46, centerY: 0.48, curls: [0.75, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
    { centerX: 0.54, centerY: 0.48, curls: [0.75, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
  ]),
  help: createMotionSequence([
    { centerX: 0.48, centerY: 0.5, curls: [0.7, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.04 },
    { centerX: 0.53, centerY: 0.43, curls: [0.7, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.03 },
  ]),
  stop: createMotionSequence([
    { centerX: 0.5, centerY: 0.47, curls: [0.3, 0.05, 0.05, 0.05, 0.05], spread: 0.18, depth: -0.04 },
  ]),
  wait: createMotionSequence([
    { centerX: 0.5, centerY: 0.42, curls: [0.2, 0.15, 0.15, 0.15, 0.15], spread: 0.1, depth: -0.03 },
    { centerX: 0.5, centerY: 0.47, curls: [0.2, 0.15, 0.15, 0.15, 0.15], spread: 0.1, depth: -0.03 },
  ]),
  come: createMotionSequence([
    { centerX: 0.58, centerY: 0.45, curls: [0.25, 0.1, 0.1, 0.1, 0.1], spread: 0.16, depth: -0.03 },
    { centerX: 0.48, centerY: 0.46, curls: [0.75, 0.75, 0.75, 0.75, 0.75], spread: -0.08, depth: -0.01 },
  ]),
  go: createMotionSequence([
    { centerX: 0.44, centerY: 0.46, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
    { centerX: 0.58, centerY: 0.44, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
  ]),
  again: createMotionSequence([
    { centerX: 0.48, centerY: 0.48, curls: [0.7, 0.75, 0.75, 0.75, 0.75], spread: -0.08, depth: 0.02 },
    { centerX: 0.54, centerY: 0.44, curls: [0.3, 0.15, 0.15, 0.15, 0.15], spread: 0.14, depth: -0.01 },
  ]),
  understand: createMotionSequence([
    { centerX: 0.52, centerY: 0.37, curls: [0.82, 0.05, 0.05, 0.95, 0.95], spread: 0.08, depth: -0.02 },
    { centerX: 0.56, centerY: 0.43, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.16, depth: -0.02 },
  ]),
  repeat: createMotionSequence([
    { centerX: 0.5, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
    { centerX: 0.44, centerY: 0.46, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
    { centerX: 0.5, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
  ]),
  name: createMotionSequence([
    { centerX: 0.48, centerY: 0.46, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.02 },
    { centerX: 0.54, centerY: 0.46, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.02 },
  ]),
  friend: createMotionSequence([
    { centerX: 0.48, centerY: 0.46, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.03 },
    { centerX: 0.53, centerY: 0.46, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.01 },
  ]),
  family: createMotionSequence([
    { centerX: 0.52, centerY: 0.42, curls: [0.25, 0.15, 0.15, 0.15, 0.15], spread: 0.18, depth: -0.02 },
    { centerX: 0.46, centerY: 0.48, curls: [0.25, 0.15, 0.15, 0.15, 0.15], spread: 0.18, depth: -0.01 },
    { centerX: 0.56, centerY: 0.48, curls: [0.25, 0.15, 0.15, 0.15, 0.15], spread: 0.18, depth: -0.01 },
  ]),
  love: createMotionSequence([
    { centerX: 0.5, centerY: 0.47, curls: [0.9, 0.95, 0.95, 0.95, 0.95], spread: -0.12, depth: 0.02 },
    { centerX: 0.5, centerY: 0.42, curls: [0.9, 0.95, 0.95, 0.95, 0.95], spread: -0.12, depth: 0.02 },
  ]),
  good: createMotionSequence([
    { centerX: 0.5, centerY: 0.37, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.04 },
    { centerX: 0.54, centerY: 0.46, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.02 },
  ]),
  morning: createMotionSequence([
    { centerX: 0.44, centerY: 0.58, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.14, depth: -0.04 },
    { centerX: 0.5, centerY: 0.42, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.14, depth: -0.03 },
  ]),
  afternoon: createMotionSequence([
    { centerX: 0.44, centerY: 0.5, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.14, depth: -0.04 },
    { centerX: 0.56, centerY: 0.45, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.14, depth: -0.03 },
  ]),
  evening: createMotionSequence([
    { centerX: 0.56, centerY: 0.4, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.14, depth: -0.03 },
    { centerX: 0.46, centerY: 0.5, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.14, depth: -0.03 },
  ]),
  bathroom: createMotionSequence([
    { centerX: 0.48, centerY: 0.47, curls: [0.55, 0.95, 0.95, 0.95, 0.95], spread: -0.08, depth: 0.02 },
    { centerX: 0.52, centerY: 0.47, curls: [0.55, 0.95, 0.95, 0.95, 0.95], spread: -0.08, depth: 0.02 },
  ]),
  water: createMotionSequence([
    { centerX: 0.52, centerY: 0.4, curls: [0.1, 0.95, 0.95, 0.95, 0.95], spread: 0.04, depth: -0.02 },
    { centerX: 0.56, centerY: 0.46, curls: [0.1, 0.95, 0.95, 0.95, 0.95], spread: 0.04, depth: -0.02 },
  ]),
  food: createMotionSequence([
    { centerX: 0.5, centerY: 0.42, curls: [0.2, 0.25, 0.25, 0.25, 0.25], spread: 0.05, depth: -0.03 },
    { centerX: 0.55, centerY: 0.48, curls: [0.2, 0.25, 0.25, 0.25, 0.25], spread: 0.05, depth: -0.02 },
  ]),
  doctor: createMotionSequence([
    { centerX: 0.48, centerY: 0.38, curls: [0.8, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.54, centerY: 0.46, curls: [0.8, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
  ]),
  emergency: createMotionSequence([
    { centerX: 0.46, centerY: 0.44, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.18, depth: -0.03 },
    { centerX: 0.56, centerY: 0.44, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.18, depth: -0.03 },
    { centerX: 0.48, centerY: 0.52, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.18, depth: -0.01 },
  ]),
  pain: createMotionSequence([
    { centerX: 0.48, centerY: 0.45, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
    { centerX: 0.52, centerY: 0.5, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.02 },
  ]),
  deaf: createMotionSequence([
    { centerX: 0.52, centerY: 0.34, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.54, centerY: 0.45, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
  ]),
  hearing: createMotionSequence([
    { centerX: 0.53, centerY: 0.36, curls: [0.15, 0.05, 0.95, 0.95, 0.95], spread: 0.05, depth: -0.03 },
    { centerX: 0.52, centerY: 0.44, curls: [0.15, 0.05, 0.95, 0.95, 0.95], spread: 0.05, depth: -0.02 },
  ]),
  left: createMotionSequence([
    { centerX: 0.56, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
    { centerX: 0.42, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
  ]),
  right: createMotionSequence([
    { centerX: 0.42, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
    { centerX: 0.58, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.1, depth: -0.03 },
  ]),
  where: createMotionSequence([
    { centerX: 0.48, centerY: 0.44, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.54, centerY: 0.44, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
  ]),
  what: createMotionSequence([
    { centerX: 0.48, centerY: 0.47, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.18, depth: -0.03 },
    { centerX: 0.56, centerY: 0.47, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.18, depth: -0.03 },
  ]),
  who: createMotionSequence([
    { centerX: 0.5, centerY: 0.34, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.05, depth: -0.02 },
    { centerX: 0.54, centerY: 0.39, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.05, depth: -0.02 },
  ]),
  today: createMotionSequence([
    { centerX: 0.46, centerY: 0.5, curls: [0.25, 0.15, 0.15, 0.15, 0.15], spread: 0.12, depth: -0.02 },
    { centerX: 0.54, centerY: 0.48, curls: [0.25, 0.15, 0.15, 0.15, 0.15], spread: 0.12, depth: -0.02 },
  ]),
  tomorrow: createMotionSequence([
    { centerX: 0.46, centerY: 0.36, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.02 },
    { centerX: 0.58, centerY: 0.44, curls: [0.2, 0.05, 0.05, 0.05, 0.05], spread: 0.12, depth: -0.02 },
  ]),
  fine: createMotionSequence([
    { centerX: 0.5, centerY: 0.46, curls: [0.1, 0.95, 0.95, 0.95, 0.95], spread: 0.03, depth: -0.03 },
    { centerX: 0.56, centerY: 0.42, curls: [0.1, 0.95, 0.95, 0.95, 0.95], spread: 0.03, depth: -0.02 },
  ]),
  okay: createMotionSequence([
    { centerX: 0.5, centerY: 0.46, curls: [0.2, 0.82, 0.1, 0.1, 0.1], spread: 0.16, depth: -0.03 },
  ]),
  school: createMotionSequence([
    { centerX: 0.48, centerY: 0.5, curls: [0.3, 0.05, 0.05, 0.05, 0.05], spread: 0.18, depth: -0.02 },
    { centerX: 0.52, centerY: 0.48, curls: [0.3, 0.05, 0.05, 0.05, 0.05], spread: 0.18, depth: -0.02 },
  ]),
  work: createMotionSequence([
    { centerX: 0.48, centerY: 0.5, curls: [0.55, 0.05, 0.05, 0.95, 0.95], spread: 0.08, depth: -0.02 },
    { centerX: 0.52, centerY: 0.46, curls: [0.55, 0.05, 0.05, 0.95, 0.95], spread: 0.08, depth: -0.02 },
  ]),
  home: createMotionSequence([
    { centerX: 0.54, centerY: 0.4, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.1, depth: -0.03 },
    { centerX: 0.5, centerY: 0.48, curls: [0.25, 0.05, 0.05, 0.05, 0.05], spread: 0.1, depth: -0.02 },
  ]),
  i: createMotionSequence([
    { centerX: 0.48, centerY: 0.5, curls: [0.9, 0.95, 0.95, 0.95, 0.1], spread: -0.06, depth: 0.03 },
  ]),
  me: createMotionSequence([
    { centerX: 0.5, centerY: 0.42, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.5, centerY: 0.48, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
  ]),
  you: createMotionSequence([
    { centerX: 0.48, centerY: 0.45, curls: [0.8, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.58, centerY: 0.45, curls: [0.8, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
  ]),
  my: createMotionSequence([
    { centerX: 0.5, centerY: 0.45, curls: [0.22, 0.08, 0.08, 0.08, 0.08], spread: 0.14, depth: -0.03 },
    { centerX: 0.5, centerY: 0.5, curls: [0.22, 0.08, 0.08, 0.08, 0.08], spread: 0.14, depth: -0.03 },
  ]),
  your: createMotionSequence([
    { centerX: 0.46, centerY: 0.46, curls: [0.22, 0.08, 0.08, 0.08, 0.08], spread: 0.14, depth: -0.03 },
    { centerX: 0.58, centerY: 0.46, curls: [0.22, 0.08, 0.08, 0.08, 0.08], spread: 0.14, depth: -0.03 },
  ]),
  am: createMotionSequence([
    { centerX: 0.46, centerY: 0.48, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.02 },
    { centerX: 0.54, centerY: 0.48, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.02 },
  ]),
  are: createMotionSequence([
    { centerX: 0.46, centerY: 0.46, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.12, depth: -0.02 },
    { centerX: 0.56, centerY: 0.46, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.12, depth: -0.02 },
  ]),
  is: createMotionSequence([
    { centerX: 0.46, centerY: 0.48, curls: [0.8, 0.05, 0.95, 0.95, 0.95], spread: 0.08, depth: -0.02 },
    { centerX: 0.54, centerY: 0.48, curls: [0.8, 0.05, 0.95, 0.95, 0.95], spread: 0.08, depth: -0.02 },
  ]),
  can: createMotionSequence([
    { centerX: 0.48, centerY: 0.48, curls: [0.95, 0.95, 0.95, 0.95, 0.95], spread: -0.16, depth: 0.02 },
    { centerX: 0.54, centerY: 0.48, curls: [0.95, 0.95, 0.95, 0.95, 0.95], spread: -0.16, depth: 0.02 },
  ]),
  need: createMotionSequence([
    { centerX: 0.5, centerY: 0.38, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.03 },
    { centerX: 0.5, centerY: 0.49, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.03 },
  ]),
  not: createMotionSequence([
    { centerX: 0.48, centerY: 0.48, curls: [0.8, 0.05, 0.05, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.52, centerY: 0.48, curls: [0.8, 0.95, 0.95, 0.95, 0.95], spread: -0.16, depth: 0.02 },
  ]),
  here: createMotionSequence([
    { centerX: 0.5, centerY: 0.48, curls: [0.15, 0.05, 0.95, 0.95, 0.95], spread: 0.05, depth: -0.02 },
    { centerX: 0.5, centerY: 0.43, curls: [0.15, 0.05, 0.95, 0.95, 0.95], spread: 0.05, depth: -0.02 },
  ]),
  see: createMotionSequence([
    { centerX: 0.52, centerY: 0.34, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
    { centerX: 0.58, centerY: 0.42, curls: [0.82, 0.05, 0.95, 0.95, 0.95], spread: 0.06, depth: -0.02 },
  ]),
  later: createMotionSequence([
    { centerX: 0.46, centerY: 0.42, curls: [0.2, 0.05, 0.05, 0.95, 0.95], spread: 0.16, depth: -0.03 },
    { centerX: 0.58, centerY: 0.46, curls: [0.2, 0.05, 0.05, 0.95, 0.95], spread: 0.16, depth: -0.02 },
  ]),
  meet: createMotionSequence([
    { centerX: 0.46, centerY: 0.46, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.03 },
    { centerX: 0.54, centerY: 0.46, curls: [0.8, 0.12, 0.12, 0.95, 0.95], spread: 0.04, depth: -0.03 },
  ]),
  nice: createMotionSequence([
    { centerX: 0.48, centerY: 0.42, curls: [0.22, 0.08, 0.08, 0.08, 0.08], spread: 0.14, depth: -0.03 },
    { centerX: 0.54, centerY: 0.48, curls: [0.22, 0.08, 0.08, 0.08, 0.08], spread: 0.14, depth: -0.03 },
  ]),
  call: createMotionSequence([
    { centerX: 0.52, centerY: 0.35, curls: [0.05, 0.95, 0.95, 0.95, 0.05], spread: 0.22, depth: -0.03 },
    { centerX: 0.56, centerY: 0.46, curls: [0.05, 0.95, 0.95, 0.95, 0.05], spread: 0.22, depth: -0.03 },
  ]),
  turn: createMotionSequence([
    { centerX: 0.48, centerY: 0.46, curls: [0.3, 0.15, 0.15, 0.15, 0.15], spread: 0.1, depth: -0.02 },
    { centerX: 0.56, centerY: 0.44, curls: [0.3, 0.15, 0.15, 0.15, 0.15], spread: 0.1, depth: -0.02 },
  ]),
};

const WORD_ALIASES: Record<string, string> = {
  hi: "hello",
  hey: "hello",
  bye: "goodbye",
  goodbye: "goodbye",
  thank: "thanks",
  thanks: "thanks",
  ok: "okay",
  restroom: "bathroom",
  toilet: "bathroom",
  physician: "doctor",
  hurt: "pain",
  deafness: "deaf",
};

function buildLetterSequence(word: string): SignFrame[] {
  const sequence: SignFrame[] = [];
  let previous = createHandPose(0.5, 0.56, [0.4, 0.25, 0.2, 0.2, 0.25], 0.06, 0);

  for (const letter of word) {
    const pose = LETTER_POSES[letter];
    if (!pose) continue;

    sequence.push(...interpolateFrames(previous, pose, 2));
    previous = pose;
  }

  sequence.push(...interpolateFrames(previous, createHandPose(0.5, 0.56, [0.4, 0.25, 0.2, 0.2, 0.25], 0.06, 0), 2));
  return sequence;
}

function resolveWordKey(word: string) {
  return WORD_ALIASES[word] ?? word;
}

function sequenceForToken(token: string): SignFrame[] {
  const key = resolveWordKey(sanitizeWord(token));
  if (!key) return [];
  if (WORD_POSES[key]) return cloneSequence(WORD_POSES[key]);
  return buildLetterSequence(key);
}

function buildSequenceFromTokens(...tokens: string[]): SignFrame[] {
  return composeSequence(...tokens.map((token) => sequenceForToken(token)).filter((segment) => segment.length > 0));
}

const PHRASE_POSES: Record<string, SignFrame[]> = {
  "thank you": cloneSequence(WORD_POSES.thanks),
  "good morning": buildSequenceFromTokens("good", "morning"),
  "good afternoon": buildSequenceFromTokens("good", "afternoon"),
  "good evening": buildSequenceFromTokens("good", "evening"),
  "how are you": buildSequenceFromTokens("how", "are", "you"),
  "i am fine": buildSequenceFromTokens("i", "am", "fine"),
  "i am okay": buildSequenceFromTokens("i", "am", "okay"),
  "my name is": buildSequenceFromTokens("my", "name", "is"),
  "what is your name": buildSequenceFromTokens("what", "is", "your", "name"),
  "nice to meet you": buildSequenceFromTokens("nice", "meet", "you"),
  "please help": buildSequenceFromTokens("please", "help"),
  "i need help": buildSequenceFromTokens("i", "need", "help"),
  "can you help me": buildSequenceFromTokens("can", "you", "help", "me"),
  "where is the bathroom": buildSequenceFromTokens("where", "is", "bathroom"),
  "where is the doctor": buildSequenceFromTokens("where", "is", "doctor"),
  "i need water": buildSequenceFromTokens("i", "need", "water"),
  "i need food": buildSequenceFromTokens("i", "need", "food"),
  "i am deaf": buildSequenceFromTokens("i", "am", "deaf"),
  "please repeat": buildSequenceFromTokens("please", "repeat"),
  "please repeat that": buildSequenceFromTokens("please", "repeat", "that"),
  "i do not understand": buildSequenceFromTokens("i", "do", "not", "understand"),
  "see you later": buildSequenceFromTokens("see", "you", "later"),
  "good to see you": buildSequenceFromTokens("good", "see", "you"),
  "call the doctor": buildSequenceFromTokens("call", "doctor"),
  "this is an emergency": buildSequenceFromTokens("this", "is", "emergency"),
  "my family is here": buildSequenceFromTokens("my", "family", "is", "here"),
  "turn left": buildSequenceFromTokens("turn", "left"),
  "turn right": buildSequenceFromTokens("turn", "right"),
  "wait for me": buildSequenceFromTokens("wait", "me"),
  "come here": buildSequenceFromTokens("come", "here"),
};

const EXACT_SIGN_LIBRARY: Record<string, SignFrame[]> = {
  ...WORD_POSES,
  ...PHRASE_POSES,
};

export function normalizeSignFrames(frames: unknown): SignFrame[] {
  if (!Array.isArray(frames)) return [];

  return frames
    .filter((frame): frame is unknown[] => Array.isArray(frame))
    .map((frame) =>
      frame
        .map((point) => {
          if (!point || typeof point !== "object") return null;
          const maybePoint = point as Partial<SignLandmark>;
          return {
            x: clamp(Number(maybePoint.x ?? 0.5), 0, 1),
            y: clamp(Number(maybePoint.y ?? 0.5), 0, 1),
            z: clamp(Number(maybePoint.z ?? 0), -1, 1),
          };
        })
        .filter((point): point is SignLandmark => point !== null)
    )
    .filter((frame) => frame.length === 21);
}

/**
 * Retrieves sign landmarks locally.
 * If the full word or phrase is not found, it falls back to word lookup and then fingerspelling.
 */
export function getLocalSign(text: string): SignFrame[] | null {
  const normalizedText = normalizeTextKey(text);
  if (!normalizedText) return null;

  if (EXACT_SIGN_LIBRARY[normalizedText]) {
    return cloneSequence(EXACT_SIGN_LIBRARY[normalizedText]);
  }

  const words = normalizedText.split(/\s+/);
  const segments: SignFrame[][] = [];

  for (const rawWord of words) {
    const resolved = resolveWordKey(sanitizeWord(rawWord));
    if (!resolved) continue;

    if (WORD_POSES[resolved]) {
      segments.push(cloneSequence(WORD_POSES[resolved]));
    } else {
      segments.push(buildLetterSequence(resolved));
    }
  }

  const sequence = composeSequence(...segments);
  return sequence.length > 0 ? sequence : null;
}
