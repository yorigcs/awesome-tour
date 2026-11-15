import { describe, expect, it, vi } from 'vitest';
import {
  type ChecklistSnapshot,
  createChecklist,
  createTour,
  createTourManager,
  memoryStorage,
} from '../src';

describe('checklist', () => {
  it('tracks progress from tours, signals, predicates and manual actions', async () => {
    const tour = createTour({ id: 'intro', steps: [{ id: 'a' }] });
    const manager = createTourManager({ tours: [tour] });
    let profileFilled = false;
    const onComplete = vi.fn();
    const checklist = createChecklist({
      id: 'getting-started',
      onComplete,
      items: [
        { id: 'tour', tour: 'intro' },
        { id: 'invite', signal: 'invited' },
        { id: 'profile', when: () => profileFilled },
        { id: 'manual' },
      ],
    });
    checklist.connect(manager);

    await checklist.startItem('tour');
    expect(tour.getState().status).toBe('active');
    await tour.next();
    expect(checklist.getState().items.tour).toBe('done');

    checklist.signal('invited');
    profileFilled = true;
    checklist.refresh();
    expect(checklist.getState()).toMatchObject({
      completed: 3,
      total: 4,
      progress: 0.75,
      done: false,
    });

    checklist.skip('manual');
    expect(checklist.getState().done).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);

    checklist.reset('manual');
    expect(checklist.getState().done).toBe(false);
    checklist.dismiss();
    expect(checklist.getState().dismissed).toBe(true);
    checklist.reset();
    expect(checklist.getState()).toMatchObject({ completed: 0, dismissed: false });
  });

  it('persists and hydrates without re-firing onComplete', async () => {
    const storage = memoryStorage<ChecklistSnapshot>();
    const items = [{ id: 'a' }, { id: 'b' }];
    const first = createChecklist({ id: 'c', items, persistence: storage });
    await first.ready();
    first.complete('a');
    first.complete('b');
    expect(await storage.get('c')).toMatchObject({ items: { a: 'done', b: 'done' } });

    const onComplete = vi.fn();
    const second = createChecklist({ id: 'c', items, persistence: storage, onComplete });
    expect(second.getState().hydrated).toBe(false);
    await second.ready();
    expect(second.getState()).toMatchObject({ hydrated: true, done: true });
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('checklist + late tour registration', () => {
  it('links tours registered after connect and follows re-created instances', async () => {
    const manager = createTourManager();
    const checklist = createChecklist({ id: 'late', items: [{ id: 'x', tour: 'later' }] });
    checklist.connect(manager);

    const first = createTour({ id: 'later', steps: [{ id: 's' }] });
    const unregister = manager.register(first);
    unregister();
    const second = createTour({ id: 'later', steps: [{ id: 's' }] });
    manager.register(second);

    await second.start();
    await second.next();
    expect(checklist.getState().items.x).toBe('done');
  });
});
