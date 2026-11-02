import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, a ring's landing point can be from a neck and still ring it. */
export const NECK_RADIUS = 14;
/** The aim sways side to side by up to this many pixels. */
export const SWAY_AMPLITUDE = 40;
/** Radians per second of the aim's sway. */
export const SWAY_SPEED = 2.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Back row first: bottles further back score more. */
export const ROWS = [
  { y: 130, points: 30 },
  { y: 210, points: 20 },
  { y: 290, points: 10 },
] as const;
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  /** Where the neck is: the point a ring must land on. */
  x: number;
  y: number;
  points: number;
  ringed: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the ring was thrown. */
  age: number;
}

export interface Miss {
  x: number;
  y: number;
}

export interface RingTossState {
  bottles: Bottle[];
  ring: Ring | null;
  misses: Miss[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(rings = RINGS_PER_ROUND): RingTossState {
  const spacing = WIDTH / (BOTTLES_PER_ROW + 1);
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: spacing * (i + 1),
      y: row.y,
      points: row.points,
      ringed: 0,
    })),
  );
  return { bottles, ring: null, misses: [], rings, score: 0, time: 0, phase: 'playing' };
}

/** How far the aim is pushed sideways right now. */
export function sway(state: RingTossState): number {
  return SWAY_AMPLITUDE * Math.sin(state.time * SWAY_SPEED);
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(b.x - x, b.y - y) <= NECK_RADIUS);
}

/**
 * Throws one ring towards the aim point, pushed sideways by the sway. Returns
 * false if nothing was thrown: the round is over, no rings are left, or a ring
 * is still in the air.
 */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + sway(state),
    toY: Math.min(aimY, THROWER.y),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Where a ring in the air is now, and how high it is above its path. */
export function ringPosition(ring: Ring): { x: number; y: number; lift: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t,
    lift: Math.sin(t * Math.PI) * 80,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
      if (bottle) {
        bottle.ringed += 1;
        state.score += bottle.points;
      } else {
        state.misses.push({ x: ring.toX, y: ring.toY });
      }
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 46, WIDTH - 80, 8);
    ctx.fillStyle = colors.muted;
    ctx.font = canvasFont('small');
    ctx.textAlign = 'left';
    ctx.fillText(`${row.points}`, 12, row.y + 40);
  }

  for (const bottle of state.bottles) {
    // Body, shoulders and neck, standing on the shelf below the neck.
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 16, 24, 30);
    ctx.beginPath();
    ctx.moveTo(bottle.x - 12, bottle.y + 16);
    ctx.lineTo(bottle.x - 4, bottle.y + 4);
    ctx.lineTo(bottle.x + 4, bottle.y + 4);
    ctx.lineTo(bottle.x + 12, bottle.y + 16);
    ctx.fill();
    ctx.fillRect(bottle.x - 4, bottle.y - 10, 8, 16);
    for (let i = 0; i < bottle.ringed; i++) drawRing(ctx, bottle.x, bottle.y + 14 - i * 5);
  }

  ctx.fillStyle = colors.danger;
  for (const miss of state.misses) {
    ctx.beginPath();
    ctx.arc(miss.x, miss.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.ring) {
    const { x, y, lift } = ringPosition(state.ring);
    drawRing(ctx, x, y - lift);
  } else if (state.phase === 'playing') {
    // Crosshair where the ring would land now, sway included.
    const x = aim.x + sway(state);
    const y = Math.min(aim.y, THROWER.y);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.stroke();
  }

  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.arc(THROWER.x, THROWER.y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
