import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  ROWS,
  SWAY_AMPLITUDE,
  THROWER,
  bottleAt,
  createState,
  step,
  sway,
  toss,
} from './game';

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
    expect(new Set(state.bottles.map((b) => b.y)).size).toBe(ROWS.length);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    toss(state, 400, 200);
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('never lands a ring behind the thrower', () => {
    const state = createState();
    toss(state, 400, THROWER.y + 100);
    expect(state.ring!.toY).toBeLessThanOrEqual(THROWER.y);
  });

  it('pushes the aim sideways by the sway, within its limits', () => {
    const state = createState();
    state.time = 0.4;
    toss(state, 400, 200);
    expect(state.ring!.toX).toBeCloseTo(400 + sway(state));
    for (let t = 0; t < 5; t += 0.1) {
      state.time = t;
      expect(Math.abs(sway(state))).toBeLessThanOrEqual(SWAY_AMPLITUDE);
    }
  });

  it('scores a ring that lands on a bottle neck once it comes down', () => {
    const state = createState();
    const bottle = state.bottles[0];
    toss(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(1);
    expect(state.ring).toBeNull();
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    toss(state, 400, 60);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('scores bottles further back higher', () => {
    const points = ROWS.map((row) => row.points);
    const backFirst = [...ROWS].sort((a, b) => a.y - b.y).map((row) => row.points);
    expect(backFirst).toEqual([...points].sort((a, b) => b - a));
    expect(new Set(points).size).toBe(points.length);
  });

  it('finds a neck within its radius and not beyond it', () => {
    const { bottles } = createState();
    const bottle = bottles[0];
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState(1);
    toss(state, 400, 60);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
    expect(toss(state, 400, 60)).toBe(false);
  });
});
