import { describe, expect, it } from 'vitest';
import {
  HOLE_RADIUS,
  POINTS_PER_WHACK,
  ROUND_SECONDS,
  createState,
  spawnGap,
  step,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with a full clock, no score and every hole empty', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('pops a mole up when the next one is due', () => {
    const state = createState();
    state.nextMole = 0.1;
    step(state, 0.2, () => 0);
    expect(state.holes[0].up).toBeGreaterThan(0);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.nextMole = 100;
    state.holes[4].up = 0.5;
    step(state, 0.6);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    const hole = state.holes[2];
    hole.up = 1;
    expect(whack(state, hole.x + 10, hole.y - 10)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(hole.up).toBe(0);
  });

  it('does not score a whack on an empty hole or beside a mole', () => {
    const state = createState();
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    hole.up = 1;
    expect(whack(state, hole.x + HOLE_RADIUS + 5, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('cannot whack the same mole twice', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.up = 1;
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('pops moles up faster and for less time as the round goes on', () => {
    const early = createState();
    const late = createState();
    late.timeLeft = 2;
    expect(spawnGap(late)).toBeLessThan(spawnGap(early));
    expect(upTime(late)).toBeLessThan(upTime(early));
  });

  it('ends the round when the time runs out and clears the moles', () => {
    const state = createState();
    state.timeLeft = 0.1;
    state.holes[0].up = 1;
    step(state, 0.2);
    expect(state.phase).toBe('over');
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('ignores whacks once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    state.holes[0].up = 1;
    expect(whack(state, state.holes[0].x, state.holes[0].y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
