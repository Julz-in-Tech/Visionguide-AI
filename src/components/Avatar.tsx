import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * SIGN_LIBRARY: Maps words to specific bone rotations.
 * Rotations are in Radians. 
 * We target Arm, ForeArm, and Hand for orientation, and generic finger curls.
 */
const SIGN_LIBRARY: Record<string, any> = {
  NEUTRAL: {
    RightArm: { x: 0, y: 0, z: 1.2 },
    RightForeArm: { x: 0, y: 0, z: 0 },
    RightHand: { x: 0, y: 0, z: 0 },
    fingers: { thumb: 0.2, index: 0.3, middle: 0.3, ring: 0.3, pinky: 0.3 }
  },
  HELLO: {
    RightArm: { x: -1.2, y: -0.2, z: 0.5 },
    RightForeArm: { x: 0, y: -0.8, z: 0 },
    RightHand: { x: 0, y: 0.5, z: 0 },
    fingers: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 } // Open hand
  },
  NAME: {
    RightArm: { x: -0.5, y: 0, z: 0.2 },
    RightForeArm: { x: 0, y: -1.2, z: 0 },
    RightHand: { x: 0, y: 0, z: 0 },
    fingers: { thumb: 1.2, index: 0, middle: 0, ring: 1.5, pinky: 1.5 } // "H" handshape
  },
  STOP: {
    RightArm: { x: -0.8, y: 0, z: 0.3 },
    RightForeArm: { x: -0.5, y: 0, z: 0 },
    RightHand: { x: 0, y: 0, z: 0 },
    fingers: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 }
  }
};

interface AvatarProps {
  textInput: string;
  modelUrl: string;
}

export const Avatar: React.FC<AvatarProps> = ({ textInput, modelUrl }) => {
  const { nodes, scene } = useGLTF(modelUrl);
  const group = useRef<THREE.Group>(null);

  /**
   * Helper to rotate all phalanges of a finger at once
   */
  const applyHandPose = (side: 'Left' | 'Right', fingerPose: any, tl: gsap.core.Timeline) => {
    const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    
    fingers.forEach((finger) => {
      const rotationValue = fingerPose[finger.toLowerCase()] || 0;
      // Most rigs have 3 bones per finger (e.g., RightHandIndex1, 2, 3)
      for (let i = 1; i <= 3; i++) {
        const boneName = `${side}Hand${finger}${i}`;
        const bone = nodes[boneName] as THREE.Bone;
        if (bone) {
          tl.to(bone.rotation, {
            x: rotationValue,
            duration: 0.4,
            ease: "power2.out"
          }, "<"); // "<" syncs with previous animation in the timeline
        }
      }
    });
  };

  /**
   * Logic to animate a single word
   */
  const animateWord = (word: string, tl: gsap.core.Timeline) => {
    const pose = SIGN_LIBRARY[word] || SIGN_LIBRARY.NEUTRAL;
    const neutral = SIGN_LIBRARY.NEUTRAL;

    // 1. Move to the Sign Pose
    ['RightArm', 'RightForeArm', 'RightHand'].forEach((part) => {
      const bone = nodes[part] as THREE.Bone;
      if (bone && pose[part]) {
        tl.to(bone.rotation, {
          x: pose[part].x,
          y: pose[part].y,
          z: pose[part].z,
          duration: 0.6,
          ease: "back.out(1.2)"
        }, ">"); // ">" means wait for previous block to finish
      }
    });
    applyHandPose('Right', pose.fingers, tl);

    // 2. Hold the sign briefly
    tl.to({}, { duration: 0.5 });

    // 3. Smoothly return to Neutral before next word
    ['RightArm', 'RightForeArm', 'RightHand'].forEach((part) => {
      const bone = nodes[part] as THREE.Bone;
      if (bone) {
        tl.to(bone.rotation, {
          x: neutral[part].x,
          y: neutral[part].y,
          z: neutral[part].z,
          duration: 0.4
        }, ">");
      }
    });
    applyHandPose('Right', neutral.fingers, tl);
  };

  useEffect(() => {
    if (!textInput) return;

    // Clear previous animations
    gsap.killTweensOf(scene);
    const tl = gsap.timeline();

    const words = textInput.toUpperCase().split(/\s+/);
    words.forEach((word) => {
      if (SIGN_LIBRARY[word]) {
        animateWord(word, tl);
      } else {
        // Optional: Implement fingerspelling loop here if word is missing
        console.warn(`Sign for ${word} not found in local library.`);
      }
    });

    return () => {
      tl.kill();
    };
  }, [textInput, nodes, scene]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
};

// Preload your model for performance
useGLTF.preload('/models/avatar.glb');