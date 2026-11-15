import { TourTarget3D, useTourCamera } from '@awesome-tour/three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

function Engine() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  return (
    <mesh ref={ref} position={[1.2, 0.3, 0]}>
      <torusKnotGeometry args={[0.5, 0.18, 128, 16]} />
      <meshStandardMaterial color="#6d5efc" metalness={0.3} roughness={0.35} />
    </mesh>
  );
}

function CameraRig() {
  useTourCamera({
    model: { position: [2.5, 1.5, 3.2], lookAt: [1.2, 0.3, 0] },
    stats: { position: [0, 0, 6], lookAt: [0, 0, 0] },
  });
  return null;
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} style={{ height: 360 }} data-testid="canvas">
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <mesh position={[-1.4, 0, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#c8c6d8" />
      </mesh>
      <TourTarget3D name="engine">
        <Engine />
      </TourTarget3D>
      <CameraRig />
    </Canvas>
  );
}
