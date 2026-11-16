import { describe, expect, it } from 'vitest';
import { createTour, frameTarget } from '../src';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('async `when` and progress', () => {
  it('updates progress once an async `when` settles to false', async () => {
    let resolve!: (v: boolean) => void;
    const gate = new Promise<boolean>((r) => {
      resolve = r;
    });
    const tour = createTour({
      id: 't',
      steps: [{ id: 'a' }, { id: 'b', when: () => gate }, { id: 'c' }],
    });
    await tour.start();
    expect(tour.getState().progress).toEqual({ current: 1, total: 3 }); // unknown yet: visible
    resolve(false);
    await tick();
    await tick();
    expect(tour.getState().progress).toEqual({ current: 1, total: 2 });
  });
});

describe('frameTarget', () => {
  it('offsets an element inside a same-origin iframe by the frame position', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const doc = iframe.contentDocument!;
    const button = doc.createElement('button');
    button.id = 'save';
    doc.body.append(button);
    iframe.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 50,
        left: 100,
        top: 50,
        right: 500,
        bottom: 350,
        width: 400,
        height: 300,
      }) as DOMRect;
    button.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        right: 70,
        bottom: 50,
        width: 60,
        height: 30,
      }) as DOMRect;

    const virtual = frameTarget(iframe, '#save')();
    expect(virtual).not.toBeNull();
    const rect = virtual!.getBoundingClientRect();
    expect(rect.left).toBe(110);
    expect(rect.top).toBe(70);
    expect(rect.width).toBe(60);
    expect(frameTarget(iframe, '#missing')()).toBeNull();
    iframe.remove();
  });
});
