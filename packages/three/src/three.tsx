import {
  type AnchorRegistry,
  defaultAnchors,
  type RectLike,
  type Tour,
  toRect,
  type VirtualElement,
} from '@awesome-tour/core';
import { TourContext, useTourProvider, useTourSelector } from '@awesome-tour/react';
import { useFrame, useThree } from '@react-three/fiber';
import * as React from 'react';
import { Box3, type Camera, type Group, MathUtils, type Object3D, Vector3 } from 'three';

const box = new Box3();
const corner = new Vector3();

/**
 * Project an object's world-space bounding box to a viewport rect (CSS pixels).
 * Corners behind the camera are ignored; if the object is fully behind, returns an empty rect.
 */
export function projectObjectToRect(
  object: Object3D,
  camera: Camera,
  canvas: HTMLElement,
): RectLike {
  const bounds = canvas.getBoundingClientRect();
  box.setFromObject(object);
  if (box.isEmpty()) {
    object.getWorldPosition(box.min);
    box.max.copy(box.min);
  }
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    corner.project(camera);
    if (corner.z > 1) continue; // behind the camera
    const x = bounds.left + ((corner.x + 1) / 2) * bounds.width;
    const y = bounds.top + ((1 - corner.y) / 2) * bounds.height;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (!Number.isFinite(left)) return toRect(-9999, -9999, 0, 0);
  return toRect(left, top, right - left, bottom - top);
}

export interface TourTarget3DProps {
  /** Anchor id — reference it from a step with `anchor(name)`. */
  name: string;
  /** Object to highlight. If omitted, `children` are wrapped in a group and highlighted. */
  object?: React.RefObject<Object3D | null>;
  children?: React.ReactNode;
  /** Registry to use. Default: the `TourProvider`'s, or the global one. */
  registry?: AnchorRegistry;
}

/**
 * Registers a 3D object as a tour target. Its projected screen rect is computed on demand, so the
 * DOM overlay / popover follow the object as the camera moves.
 *
 * @example
 * <Canvas>
 *   <TourTarget3D name="engine"><Engine /></TourTarget3D>
 * </Canvas>
 * // step: { id: 'engine', target: anchor('engine') }
 */
export function TourTarget3D({ name, object, children, registry }: TourTarget3DProps) {
  const group = React.useRef<Group>(null);
  const get = useThree((s) => s.get);
  const canvas = useThree((s) => s.gl.domElement);
  const provider = useTourProvider();
  const anchors = registry ?? provider?.anchors ?? defaultAnchors;

  React.useEffect(() => {
    const target: VirtualElement = {
      contextElement: canvas,
      getBoundingClientRect: () => {
        const obj = object?.current ?? group.current;
        return obj ? projectObjectToRect(obj, get().camera, canvas) : toRect(-9999, -9999, 0, 0);
      },
    };
    return anchors.register(name, target);
  }, [name, anchors, canvas, get, object]);

  return children ? <group ref={group}>{children}</group> : null;
}

/* -----------------------------------------------------------------------------------------------*/

export type Vec3 = readonly [number, number, number];

export interface CameraShot {
  position: Vec3;
  lookAt?: Vec3;
}

export interface UseTourCameraOptions {
  /** Tour to follow. Default: the nearest `Tour.Root`'s. */
  tour?: Tour<any, any>;
  /** Damping factor (higher = faster). Default: 4. */
  smoothing?: number;
  /** Orbit-style controls whose `target` should follow `lookAt` (e.g. drei's OrbitControls). */
  controls?: React.RefObject<{ target: Vector3; update(): void } | null>;
}

const noopStore = {
  subscribe: () => () => {},
  getState: () => ({ status: 'idle', stepId: null }) as never,
};

/**
 * Fly the camera to a shot for each step. Stops animating once settled so user controls are free.
 *
 * @example
 * useTourCamera({ engine: { position: [4, 2, 6], lookAt: [0, 1, 0] } });
 */
export function useTourCamera(
  shots: Partial<Record<string, CameraShot>>,
  options: UseTourCameraOptions = {},
) {
  const root = React.useContext(TourContext);
  const tour = options.tour ?? root?.tour;
  const stepId = useTourSelector(tour ?? noopStore, (s) =>
    s.status === 'active' ? s.stepId : null,
  );
  const smoothing = options.smoothing ?? 4;
  const lookAt = React.useRef(new Vector3());
  const settled = React.useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart the flight on step change
  React.useEffect(() => {
    settled.current = false;
  }, [stepId]);

  useFrame(({ camera }, delta) => {
    if (settled.current || !stepId) return;
    const shot = shots[stepId];
    if (!shot) {
      settled.current = true;
      return;
    }
    const [px, py, pz] = shot.position;
    camera.position.set(
      MathUtils.damp(camera.position.x, px, smoothing, delta),
      MathUtils.damp(camera.position.y, py, smoothing, delta),
      MathUtils.damp(camera.position.z, pz, smoothing, delta),
    );
    if (shot.lookAt) {
      const [lx, ly, lz] = shot.lookAt;
      const l = lookAt.current;
      l.set(
        MathUtils.damp(l.x, lx, smoothing, delta),
        MathUtils.damp(l.y, ly, smoothing, delta),
        MathUtils.damp(l.z, lz, smoothing, delta),
      );
      camera.lookAt(l);
      const controls = options.controls?.current;
      if (controls) {
        controls.target.copy(l);
        controls.update();
      }
    }
    const done =
      camera.position.distanceTo(corner.set(px, py, pz)) < 0.001 &&
      (!shot.lookAt || lookAt.current.distanceTo(corner.set(...shot.lookAt)) < 0.001);
    if (done) settled.current = true;
  });
}
