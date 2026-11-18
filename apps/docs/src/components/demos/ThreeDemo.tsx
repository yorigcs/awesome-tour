import { anchor, createAnchorRegistry, createTour, Tour, TourProvider } from '@awesome-tour/react';
import { TourTarget3D, useTourCamera } from '@awesome-tour/three';
import { Canvas } from '@react-three/fiber';
import { TourPopover } from '@/components/awesome-tour/tour';
import { DemoFrame, StartButton } from './ui';

// Anchors scoped to this demo, shared by the scene (which registers) and the tour (which reads).
const anchors = createAnchorRegistry();

const tour = createTour({
  id: 'docs-three',
  anchors,
  steps: [
    {
      id: 'pads',
      target: anchor('pads'),
      title: 'Sixteen pads',
      description: 'The LW-16 mirrors the sequencer: one pad per step, lit when it plays.',
    },
    {
      id: 'knobs',
      target: anchor('knobs'),
      title: 'Hands-on knobs',
      description: 'Drive and level, mapped to the drum bus. The camera flies in for each step.',
    },
    {
      id: 'screen',
      target: anchor('screen'),
      title: 'Tempo at a glance',
      description: 'The card follows the object as the camera moves: it’s projected every frame.',
    },
  ],
});

// Loopwork's track colors, as hex for WebGL materials.
const AMBER = '#c97b1d';
const LIT = new Set([0, 3, 6, 8, 11, 12]);

function DrumMachine() {
  return (
    <group rotation={[-0.35, 0, 0]}>
      {/* Body */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[3.4, 0.3, 2.4]} />
        <meshStandardMaterial color="#26262b" roughness={0.6} />
      </mesh>
      <TourTarget3D name="pads" registry={anchors}>
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
      </TourTarget3D>
      <TourTarget3D name="knobs" registry={anchors}>
        {[0, 1].map((k) => (
          <mesh key={k} position={[0.75 + k * 0.6, 0.08, 0.35]}>
            <cylinderGeometry args={[0.2, 0.22, 0.16, 32]} />
            <meshStandardMaterial color="#d8d8dc" metalness={0.4} roughness={0.35} />
          </mesh>
        ))}
      </TourTarget3D>
      <TourTarget3D name="screen" registry={anchors}>
        <mesh position={[1.05, 0.02, -0.45]}>
          <boxGeometry args={[1.0, 0.04, 0.5]} />
          <meshStandardMaterial color="#141a10" emissive="#9ccf52" emissiveIntensity={0.18} />
        </mesh>
      </TourTarget3D>
    </group>
  );
}

function CameraRig() {
  useTourCamera(
    {
      pads: { position: [-0.5, 3.1, 3.1], lookAt: [-0.5, 0, -0.1] },
      knobs: { position: [1.5, 2.1, 2.9], lookAt: [0.9, 0, 0.2] },
      screen: { position: [1.2, 2.6, 2.3], lookAt: [0.9, 0, -0.4] },
    },
    { tour },
  );
  return null;
}

export function ThreeDemo() {
  return (
    <TourProvider anchors={anchors}>
      <Tour.Root tour={tour}>
        <DemoFrame
          title="@awesome-tour/three"
          actions={<StartButton />}
          footer="A WebGL scene: no DOM elements to point at. Each step targets a 3D object."
        >
          <div
            data-app=""
            role="img"
            aria-label="The LW-16 drum machine, in 3D"
            className="overflow-hidden rounded-lg border bg-background"
          >
            <Canvas camera={{ position: [0, 3, 4.2], fov: 40 }} style={{ height: 340 }}>
              <ambientLight intensity={0.55} />
              <directionalLight position={[3, 5, 4]} intensity={1.3} />
              <DrumMachine />
              <CameraRig />
            </Canvas>
          </div>
        </DemoFrame>
        <TourPopover />
      </Tour.Root>
    </TourProvider>
  );
}
