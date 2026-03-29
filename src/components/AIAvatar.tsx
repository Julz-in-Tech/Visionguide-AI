import React, { Suspense, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { Loader2, Sparkles } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Points, PointMaterial, Line, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { SignLandmark } from "../services/signLibrary";

interface AIAvatarProps {
  landmarks: SignLandmark[] | null;
  isGenerating: boolean;
  isThinking?: boolean;
  phrase?: string;
}

class AvatarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("AIAvatar render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const LandmarkSkeleton = ({ landmarks }: { landmarks: SignLandmark[] }) => {
  const { points, shoulder, elbow, wrist } = useMemo(() => {
    const projectedPoints = landmarks.map(
      (landmark) =>
        new THREE.Vector3(
          (landmark.x - 0.5) * 1.95,
          (0.54 - landmark.y) * 2.05 + 0.05,
          (landmark.z || 0) * -1.55 + 0.16
        )
    );

    const wristPoint = projectedPoints[0] ?? new THREE.Vector3(0.45, 0.08, 0.1);
    const shoulderPoint = new THREE.Vector3(wristPoint.x < 0 ? -0.22 : 0.22, 0.1, -0.04);
    const elbowPoint = shoulderPoint.clone().lerp(wristPoint, 0.52);
    elbowPoint.y += 0.09;
    elbowPoint.z += 0.08;

    return {
      points: projectedPoints,
      shoulder: shoulderPoint,
      elbow: elbowPoint,
      wrist: wristPoint,
    };
  }, [landmarks]);

  return (
    <group>
      <Line points={[shoulder, elbow, wrist]} color="#14F195" lineWidth={2.4} transparent opacity={0.82} />

      <Points positions={new Float32Array(points.flatMap((point) => [point.x, point.y, point.z]))}>
        <PointMaterial transparent color="#FF00FF" size={0.06} sizeAttenuation depthWrite={false} />
      </Points>

      {HAND_CONNECTIONS.map(([start, end], index) => {
        const startPoint = points[start];
        const endPoint = points[end];
        if (!startPoint || !endPoint) return null;

        return (
          <Line
            key={index}
            points={[startPoint, endPoint]}
            color="#FF00FF"
            lineWidth={1.9}
            transparent
            opacity={0.78}
          />
        );
      })}
    </group>
  );
};

const AvatarBody = ({ isThinking }: { isThinking?: boolean }) => (
  <group position={[0, -0.06, 0]}>
    <mesh position={[0, 0.74, 0]}>
      <sphereGeometry args={[0.17, 24, 24]} />
      <meshStandardMaterial
        color={isThinking ? "#14F195" : "#FF00FF"}
        emissive={isThinking ? "#14F195" : "#FF00FF"}
        emissiveIntensity={0.18}
        wireframe
      />
    </mesh>

    <mesh position={[0, 0.18, 0]}>
      <cylinderGeometry args={[0.18, 0.28, 0.58, 24]} />
      <meshStandardMaterial color="#111216" transparent opacity={0.72} />
    </mesh>
  </group>
);

const Scene = ({ landmarks, isThinking }: { landmarks: SignLandmark[] | null; isThinking?: boolean }) => {
  return (
    <>
      <color attach="background" args={["#050507"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} color="#ffffff" />
      <pointLight position={[1.8, 1.6, 1.2]} intensity={0.9} color="#FF00FF" />

      <group position={[0, -0.12, 0]}>
        <AvatarBody isThinking={isThinking} />
        {landmarks && <LandmarkSkeleton landmarks={landmarks} />}
      </group>

      <ContactShadows position={[0, -0.72, 0]} opacity={0.35} scale={4.2} blur={2} far={1.6} />
    </>
  );
};

const FallbackAvatar = ({ landmarks, isThinking, phrase }: { landmarks: SignLandmark[] | null; isThinking?: boolean; phrase?: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#181920_0%,#08080b_65%,#030304_100%)]">
    <div className="relative">
      <div className={`w-28 h-28 rounded-full border ${isThinking ? "border-[#14F195]/60" : "border-[#FF00FF]/50"} bg-white/5`} />
      <div className="absolute left-1/2 top-[5.9rem] h-28 w-32 -translate-x-1/2 rounded-[40px] border border-white/10 bg-white/5" />
      {landmarks && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-[#FF00FF]/60 bg-[#FF00FF]/10" />
        </div>
      )}
    </div>

    <div className="mt-6 text-center px-6">
      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Avatar Fallback Active</p>
      {phrase && <p className="mt-2 text-sm text-white/70">{phrase}</p>}
    </div>
  </div>
);

export const AIAvatar: React.FC<AIAvatarProps> = ({ landmarks, isGenerating, isThinking, phrase }) => {
  const [hasContextError, setHasContextError] = useState(false);

  return (
    <div className="relative w-full h-full bg-[radial-gradient(circle_at_top,#1a1b22_0%,#09090b_55%,#030304_100%)] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {hasContextError ? (
        <FallbackAvatar landmarks={landmarks} isThinking={isThinking} phrase={phrase} />
      ) : (
        <AvatarErrorBoundary fallback={<FallbackAvatar landmarks={landmarks} isThinking={isThinking} phrase={phrase} />}>
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#FF00FF] animate-spin" />
              </div>
            }
          >
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [0, 0.02, 2.45], fov: 48 }}
              gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
              onCreated={({ gl }) => {
                const canvas = gl.domElement;
                canvas.addEventListener(
                  "webglcontextlost",
                  (event) => {
                    event.preventDefault();
                    setHasContextError(true);
                  },
                  { once: true }
                );
              }}
            >
              <Scene landmarks={landmarks} isThinking={isThinking} />
            </Canvas>
          </Suspense>
        </AvatarErrorBoundary>
      )}

      <div className="absolute bottom-8 left-8 right-8 z-30 flex items-end justify-between gap-4">
        <div className="space-y-1 max-w-[70%]">
          <motion.h3
            animate={isThinking ? { opacity: [0.55, 1, 0.55] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xl font-bold uppercase tracking-tighter"
          >
            Sign Avatar
          </motion.h3>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">SASL Visualization Engine</p>
          {phrase && <p className="text-sm text-white/75 line-clamp-2">{phrase}</p>}
        </div>

        <AnimatePresence>
          {landmarks && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF00FF]/20 border border-[#FF00FF]/40 backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-[#FF00FF]" />
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#FF00FF]">Active Signing</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-[#FF00FF] animate-spin" />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.45, 1, 0.45] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-[#FF00FF]/20 blur-xl rounded-full"
              />
            </div>
            <p className="mt-6 text-sm font-mono text-white/60 uppercase tracking-widest animate-pulse">
              Building Sign Sequence...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!landmarks && !isGenerating && !hasContextError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="opacity-10"
          >
            <Sparkles className="w-32 h-32 text-[#FF00FF]" />
          </motion.div>
        </div>
      )}
    </div>
  );
};
