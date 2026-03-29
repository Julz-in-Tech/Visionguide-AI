import React, { Suspense, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, User, AlertCircle } from "lucide-react";

interface RPMAvatarProps {
  modelUrl?: string;
  isThinking?: boolean;
}

// Simple Error Boundary Component for Three.js
class ThreeErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("3D Avatar Error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const AvatarModel = ({ url }: { url: string }) => {
  // Pre-fetch check or just let useGLTF handle it
  const { scene } = useGLTF(url);
  
  useMemo(() => {
    scene.position.set(0, -1, 0);
    scene.scale.set(1, 1, 1);
    scene.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
};

const FallbackAvatar = ({ isThinking }: { isThinking?: boolean }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#151619] z-10">
    <motion.div
      animate={isThinking ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      className="relative"
    >
      <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
        <User className="w-16 h-16 text-white/20" />
      </div>
      {isThinking && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#00FF00] rounded-full flex items-center justify-center animate-pulse">
          <div className="w-2 h-2 bg-black rounded-full" />
        </div>
      )}
    </motion.div>
    <div className="mt-4 text-center">
      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">3D Engine Offline</p>
      <p className="text-[8px] font-mono text-white/20 uppercase mt-1">Using Neural Silhouette</p>
    </div>
  </div>
);

export const RPMAvatar: React.FC<RPMAvatarProps> = ({ 
  // Using a more stable, verified RPM avatar URL
  modelUrl = "https://models.readyplayer.me/648596f264906f9797302484.glb",
  isThinking 
}) => {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Pre-check the URL to catch network/CORS errors early
    const checkModel = async () => {
      try {
        const response = await fetch(modelUrl, { method: 'HEAD', mode: 'no-cors' });
        // If we get here, the network request at least didn't fail hard
      } catch (err) {
        console.warn("RPM Model pre-check failed, falling back to silhouette:", err);
        setLoadError(true);
      }
    };
    checkModel();
  }, [modelUrl]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#151619] to-black rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#00FF00 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      
      {loadError ? (
        <FallbackAvatar isThinking={isThinking} />
      ) : (
        <ThreeErrorBoundary fallback={<FallbackAvatar isThinking={isThinking} />}>
          <Suspense fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50">
              <Loader2 className="w-12 h-12 text-[#00FF00] animate-spin mb-4" />
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Loading 3D Avatar...</p>
            </div>
          }>
            <Canvas shadows camera={{ position: [0, 0, 2.5], fov: 45 }} onError={() => setLoadError(true)}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
              <pointLight position={[-10, -10, -10]} intensity={0.5} />
              
              <AvatarModel url={modelUrl} />
              
              <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={10} blur={2} far={1} />
              <Environment preset="city" />
              
              <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                minPolarAngle={Math.PI / 2.5}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
          </Suspense>
        </ThreeErrorBoundary>
      )}

      {/* Overlay Info */}
      <div className="absolute bottom-8 left-8 right-8 z-30 flex items-end justify-between pointer-events-none">
        <div className="space-y-1">
          <motion.h3 
            animate={isThinking ? { opacity: [0.5, 1, 0.5], color: ["#FFFFFF", "#00FF00", "#FFFFFF"] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xl font-bold uppercase tracking-tighter"
          >
            {isThinking ? "Thinking..." : "Neural Guide"}
          </motion.h3>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Ready Player Me // v4.0</p>
        </div>
        
        {isThinking && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-3 h-3 rounded-full bg-[#00FF00] shadow-[0_0_10px_#00FF00]"
          />
        )}
      </div>

      {/* Thinking Glow */}
      {isThinking && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[#00FF00]/5 animate-pulse" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00FF00] to-transparent opacity-50" />
        </div>
      )}
    </div>
  );
};
