"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { AdditiveBlending, CapsuleGeometry, Color, Float32BufferAttribute, Quaternion, Vector3 } from "three";
import type { BufferGeometry, Group } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Point = [number, number];

/** The same coordinates as the flat logo's 64 by 64 artwork. */
const OUTER_TRACE: Point[] = [[8, 14], [8, 22], [32, 56], [56, 22], [56, 14]];
const INNER_TRACE: Point[] = [[21, 14], [21, 19], [32, 36], [43, 19], [43, 14]];
const NODES: { at: Point; radius: number; color: string }[] = [
  { at: [8, 11], radius: 0.28, color: "#06b6d4" },
  { at: [56, 11], radius: 0.28, color: "#06b6d4" },
  { at: [21, 11], radius: 0.25, color: "#7c3aed" },
  { at: [43, 11], radius: 0.25, color: "#7c3aed" },
];

/** Each signal runs from a top node down to the point of its V. */
const SIGNAL_ROUTES: { path: Point[]; delay: number }[] = [
  { path: OUTER_TRACE.slice(0, 3), delay: 0 },
  { path: OUTER_TRACE.slice(2).reverse(), delay: 0.5 },
  { path: INNER_TRACE.slice(0, 3), delay: 0.25 },
  { path: INNER_TRACE.slice(2).reverse(), delay: 0.75 },
];

const TUBE_RADIUS = 0.19;
const SIGNAL_SECONDS = 2.6;
const SIGNAL_GLOW = [
  { radius: 0.2, opacity: 0.8 },
  { radius: 0.3, opacity: 0.3 },
  { radius: 0.42, opacity: 0.12 },
];
const UP = new Vector3(0, 1, 0);

function toScene([x, y]: Point) {
  return new Vector3((x - 32) / 14, (33 - y) / 14, 0);
}

/** One merged mesh, coloured along the same cyan to violet diagonal as the flat logo. */
function buildTraces(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const trace of [OUTER_TRACE, INNER_TRACE]) {
    const points = trace.map(toScene);
    points.slice(1).forEach((to, i) => {
      const from = points[i] ?? to;
      const direction = to.clone().sub(from);
      const part = new CapsuleGeometry(TUBE_RADIUS, direction.length(), 6, 16);
      part.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.clone().normalize()));
      part.translate((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
      parts.push(part);
    });
  }

  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());

  const position = merged.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const cyan = new Color("#22d3ee");
  const violet = new Color("#7c3aed");
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const along = (position.getX(i) + 1.9 - position.getY(i) + 1.9) / 3.8 / 2;
    color.lerpColors(cyan, violet, Math.min(1, Math.max(0, along * 1.15)));
    color.toArray(colors, i * 3);
  }
  merged.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return merged;
}

function pointAlong(path: Vector3[], progress: number, target: Vector3) {
  const position = progress * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(position));
  const from = path[index];
  const to = path[index + 1];
  if (from && to) target.lerpVectors(from, to, position - index);
}

function Signal({ path, delay }: { path: Point[]; delay: number }) {
  const signal = useRef<Group>(null);
  const points = useMemo(() => path.map(toScene), [path]);

  useFrame(({ clock }) => {
    if (!signal.current) return;
    const progress = (clock.elapsedTime / SIGNAL_SECONDS + delay) % 1;
    pointAlong(points, progress, signal.current.position);
    // Grows in and fades out at each end, so it never pops.
    signal.current.scale.setScalar(Math.sin(progress * Math.PI));
  });

  // Layered additive spheres read as light, where a single solid one reads as a band around the tube.
  return (
    <group ref={signal}>
      {SIGNAL_GLOW.map(({ radius, opacity }) => (
        <mesh key={radius}>
          <sphereGeometry args={[radius, 12, 12]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={opacity} blending={AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function CircuitLogo() {
  const follow = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const traces = useMemo(() => buildTraces(), []);

  // Listens on the window, because the cursor is usually over the form, not the canvas.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ clock }, delta) => {
    // Sways instead of spinning, so the logo never turns edge-on and stops reading as a V.
    if (sway.current) sway.current.rotation.y = Math.sin(clock.elapsedTime * 0.55) * 0.5;
    if (follow.current) {
      const ease = Math.min(1, delta * 2.5);
      follow.current.rotation.y += (pointer.current.x * 0.4 - follow.current.rotation.y) * ease;
      follow.current.rotation.x += (pointer.current.y * 0.3 - follow.current.rotation.x) * ease;
    }
  });

  return (
    <group ref={follow}>
      <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.5}>
        <group ref={sway}>
          <mesh geometry={traces}>
            <meshPhysicalMaterial vertexColors roughness={0.2} metalness={0.35} clearcoat={1} clearcoatRoughness={0.12} emissive="#4c1d95" emissiveIntensity={0.35} />
          </mesh>
          {NODES.map(({ at, radius, color }) => (
            <mesh key={at.join()} position={toScene(at)}>
              <sphereGeometry args={[radius, 24, 24]} />
              <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.25} clearcoat={1} />
            </mesh>
          ))}
          {SIGNAL_ROUTES.map(({ path, delay }) => (
            <Signal key={delay} path={path} delay={delay} />
          ))}
        </group>
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} color="#ffffff" />
      <pointLight position={[-4, 2, 3]} intensity={24} color="#22d3ee" />
      <pointLight position={[4, -3, 2]} intensity={30} color="#a78bfa" />
      <CircuitLogo />
    </Canvas>
  );
}
