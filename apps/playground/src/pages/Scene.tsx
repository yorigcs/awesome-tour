import { TourTarget3D, useTourCamera } from '@awesome-tour/three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { hasWebGL2 } from '../webgl';

const AMBER = '#c97b1d';
const LIT = new Set([0, 3, 6, 8, 11, 12]);

/** The LW-16 drum machine. Its pads pulse slowly so the projected rect keeps changing. */
function LW16() {
  const pads = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (pads.current) pads.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.02;
  });
  return (
    <group rotation={[-0.35, 0, 0]} position={[0.6, 0, 0]}>
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[3.4, 0.3, 2.4]} />
        <meshStandardMaterial color="#26262b" roughness={0.6} />
      </mesh>
      <group ref={pads}>
        {Array.from({ length: 16 }, (_, i) => (
          <mesh
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4×4 grid
            key={i}
            position={[-1.35 + (i % 4) * 0.42, 0.04, -0.6 + Math.floor(i / 4) * 0.42]}
          >
            <boxGeometry args={[0.34, 0.08, 0.34]} />
            <meshStandardMaterial
              color={LIT.has(i) ? AMBER : '#4a4a52'}
              emissive={LIT.has(i) ? AMBER : '#000000'}
              emissiveIntensity={LIT.has(i) ? 0.35 : 0}
            />
          </mesh>
        ))}
      </group>
      {[0, 1].map((k) => (
        <mesh key={k} position={[0.75 + k * 0.6, 0.08, 0.35]}>
          <cylinderGeometry args={[0.2, 0.22, 0.16, 32]} />
          <meshStandardMaterial color="#d8d8dc" metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig() {
  useTourCamera({
    model: { position: [1.4, 2.8, 3.4], lookAt: [0.6, 0, 0] },
    lanes: { position: [0, 3, 5], lookAt: [0, 0, 0] },
  });
  return null;
}

export function Scene() {
  if (!hasWebGL2()) {
    return (
      <p className="grid h-[360px] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
        The 3D view needs WebGL, which this browser doesn't offer.
      </p>
    );
  }
  return (
    <Canvas camera={{ position: [0, 3, 5], fov: 45 }} style={{ height: 360 }} data-testid="canvas">
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <TourTarget3D name="lw16">
        <LW16 />
      </TourTarget3D>
      <CameraRig />
    </Canvas>
  );
}
