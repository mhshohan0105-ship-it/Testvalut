"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Group, Mesh } from "three";

function GlassKnot() {
  const follow = useRef<Group>(null);
  const knot = useRef<Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });

  // Listens on the window, because the cursor is usually over the form, not the canvas.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_state, delta) => {
    if (knot.current) {
      knot.current.rotation.x += delta * 0.12;
      knot.current.rotation.y += delta * 0.18;
    }
    if (follow.current) {
      const ease = Math.min(1, delta * 2.5);
      follow.current.rotation.y += (pointer.current.x * 0.4 - follow.current.rotation.y) * ease;
      follow.current.rotation.x += (pointer.current.y * 0.3 - follow.current.rotation.x) * ease;
    }
  });

  return (
    <group ref={follow}>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <mesh ref={knot}>
          <torusKnotGeometry args={[1, 0.34, 120, 18]} />
          <meshPhysicalMaterial color="#a78bfa" roughness={0.16} metalness={0.15} clearcoat={1} clearcoatRoughness={0.1} iridescence={1} iridescenceIOR={1.35} transparent opacity={0.92} />
        </mesh>
      </Float>
    </group>
  );
}

export default function LoginScene({ active, onReady }: { active: boolean; onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={onReady}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#ffffff" />
      <pointLight position={[-4, -2, 3]} intensity={45} color="#22d3ee" />
      <pointLight position={[4, -3, -2]} intensity={40} color="#7c3aed" />
      <GlassKnot />
    </Canvas>
  );
}
