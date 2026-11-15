import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { projectObjectToRect } from '../src';

function canvas(width: number, height: number) {
  const el = document.createElement('canvas');
  el.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON() {},
  });
  return el;
}

describe('projectObjectToRect', () => {
  it('projects a centered cube to a centered screen rect', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    mesh.updateMatrixWorld();
    const rect = projectObjectToRect(mesh, camera, canvas(400, 400));
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.left + rect.width / 2).toBeCloseTo(200, 0);
    expect(rect.top + rect.height / 2).toBeCloseTo(200, 0);
  });

  it('returns an off-screen empty rect for objects behind the camera', () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    mesh.position.set(0, 0, 20);
    mesh.updateMatrixWorld();
    const rect = projectObjectToRect(mesh, camera, canvas(400, 400));
    expect(rect.width).toBe(0);
  });
});
