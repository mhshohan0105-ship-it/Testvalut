"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

const FILL_RADIUS = 1.12;

function Orb({ percent }: { percent: number }) {
  const core = useRef<Mesh>(null);
  const ring = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (core.current) core.current.rotation.y += delta * 0.3;
    // Only a slight sway: spinning the ring would foreshorten it and make the fill unreadable.
    if (ring.current) {
      ring.current.rotation.x = Math.sin(clock.elapsedTime * 0.6) * 0.14;
      ring.current.rotation.y = Math.cos(clock.elapsedTime * 0.45) * 0.14;
    }
  });
  const arc = Math.max(0.001, (percent / 100) * Math.PI * 2);

  return (
    <>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.7, 2]} />
        <meshStandardMaterial color="#4338ca" emissive="#312e81" emissiveIntensity={0.7} roughness={0.3} metalness={0.25} flatShading />
      </mesh>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[FILL_RADIUS, 0.05, 12, 72]} />
          <meshStandardMaterial color="#64748b" roughness={0.6} transparent opacity={0.45} />
        </mesh>
        {/* Starts at 12 o'clock and fills clockwise, like the CSS fallback. */}
        <group rotation={[0, Math.PI, -Math.PI / 2]}>
          <mesh>
            <torusGeometry args={[FILL_RADIUS, 0.085, 12, 72, arc]} />
            <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.9} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export default function OrbScene({ percent, active }: { percent: number; active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 3.4], fov: 45 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 3, 4]} intensity={30} />
      <pointLight position={[-3, -2, 2]} intensity={12} color="#67e8f9" />
      <Orb percent={percent} />
    </Canvas>
  );
}
