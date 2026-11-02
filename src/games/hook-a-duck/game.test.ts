import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DUCK_VALUES,
  HOOK_BOTTOM,
  ROD_Y,
  createState,
  cast,
  duckPosition,
  moveHook,
  step,
} from './game';

describe('hook a duck', () => {
  it('starts with every cast, no score and a duck for every value', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual([...DUCK_VALUES]);
    expect(state.hook.motion).toBe('idle');
  });

  it('floats the ducks round the stream and back to the start', () => {
    const state = createState();
    const start = state.ducks[0].t;
    step(state, 1);
    expect(state.ducks[0].t).toBeGreaterThan(start);
    for (let i = 0; i < 1000; i++) step(state, 0.05);
    expect(state.ducks.every((d) => d.t >= 0 && d.t < 1)).toBe(true);
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state, 200)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.motion).toBe('down');
    expect(state.hook.x).toBe(200);
  });

  it('cannot cast again while the hook is still out', () => {
    const state = createState();
    cast(state, 200);
    expect(cast(state, 300)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('only moves the rod while the hook is up', () => {
    const state = createState();
    moveHook(state, 100);
    expect(state.hook.x).toBe(100);
    cast(state, 100);
    moveHook(state, 500);
    expect(state.hook.x).toBe(100);
  });

  it('scores the number on the duck it catches', () => {
    const state = createState();
    const duck = state.ducks[3];
    const { x, y } = duckPosition(duck);
    cast(state, x);
    state.hook.y = y - 1;
    step(state, 0);
    expect(state.score).toBe(duck.value);
    expect(state.hook.duck).toBe(3);
    expect(state.hook.motion).toBe('up');
  });

  it('scores nothing when the hook misses every duck', () => {
    const state = createState();
    state.ducks = [];
    cast(state, 400);
    for (let i = 0; i < 100; i++) step(state, 0.05);
    expect(state.score).toBe(0);
    expect(state.hook.motion).toBe('idle');
  });

  it('turns back at the bottom and returns to the rod', () => {
    const state = createState();
    state.ducks = [];
    cast(state, 400);
    step(state, 10);
    expect(state.hook.y).toBe(HOOK_BOTTOM);
    expect(state.hook.motion).toBe('up');
    step(state, 10);
    expect(state.hook.y).toBe(ROD_Y);
    expect(state.hook.motion).toBe('idle');
  });

  it('puts a caught duck back in the stream when the hook is up', () => {
    const state = createState();
    const { x, y } = duckPosition(state.ducks[0]);
    cast(state, x);
    state.hook.y = y;
    step(state, 0);
    step(state, 10);
    expect(state.hook.duck).toBeNull();
    expect(state.ducks).toHaveLength(DUCK_VALUES.length);
  });

  it('ends the round once the last cast is back up', () => {
    const state = createState();
    state.ducks = [];
    state.casts = 1;
    cast(state, 400);
    step(state, 0.1);
    expect(state.phase).toBe('playing');
    step(state, 10);
    step(state, 10);
    expect(state.phase).toBe('over');
    expect(cast(state, 400)).toBe(false);
  });
});
