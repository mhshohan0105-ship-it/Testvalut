"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Mesh } from "three";

function Shape() {
  const mesh = useRef<Mesh>(null);
  useFrame((_state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.2;
      mesh.current.rotation.y += delta * 0.3;
    }
  });
  return (
    <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#4f46e5" emissiveIntensity={0.35} roughness={0.25} metalness={0.3} flatShading />
      </mesh>
    </Float>
  );
}

export default function EmptyScene({ active, onReady }: { active: boolean; onReady: () => void }) {
  return (
    <Canvas dpr={[1, 1.5]} frameloop={active ? "always" : "never"} camera={{ position: [0, 0, 3.2], fov: 42 }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} onCreated={onReady} aria-hidden>
      <ambientLight intensity={0.8} />
      <pointLight position={[3, 3, 4]} intensity={35} />
      <pointLight position={[-3, -2, 2]} intensity={14} color="#22d3ee" />
      <Shape />
    </Canvas>
  );
}
