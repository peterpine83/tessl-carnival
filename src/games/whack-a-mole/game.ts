import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_WHACK = 10;
export const HOLE_RADIUS = 48;
const COLUMNS = 3;
const ROWS = 3;
/** Seconds between moles at the start of the round, and at the end. */
const SPAWN_GAP = { start: 1.0, end: 0.35 };
/** Seconds a mole stays up at the start of the round, and at the end. */
const UP_TIME = { start: 1.3, end: 0.6 };
const BONK_SECONDS = 0.3;

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops back down; 0 when the hole is empty. */
  up: number;
  /** Seconds left on the bonk effect after a whack; 0 when there is none. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextMole: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const spacingX = WIDTH / (COLUMNS + 1);
  const top = 130;
  const spacingY = 115;
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      holes.push({ x: spacingX * (col + 1), y: top + spacingY * row, up: 0, bonk: 0 });
    }
  }
  return { holes, timeLeft: ROUND_SECONDS, nextMole: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(state: WhackAMoleState): number {
  return 1 - Math.max(state.timeLeft, 0) / ROUND_SECONDS;
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Seconds until the next mole: the gap shrinks as the round goes on. */
export function spawnGap(state: WhackAMoleState): number {
  return lerp(SPAWN_GAP.start, SPAWN_GAP.end, progress(state));
}

/** Seconds a new mole stays up: moles get quicker as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_TIME.start, UP_TIME.end, progress(state));
}

export function isOnMole(hole: Hole, x: number, y: number): boolean {
  return hole.up > 0 && Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS;
}

/** Whacks at a point on the canvas. Returns true if it hit a mole. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isOnMole(h, x, y));
  if (!hole) return false;
  hole.up = 0;
  hole.bonk = BONK_SECONDS;
  state.score += POINTS_PER_WHACK;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` returns a number in [0, 1) and
 * picks which empty hole the next mole pops out of.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random) {
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const hole of state.holes) {
    hole.up = Math.max(hole.up - dt, 0);
    hole.bonk = Math.max(hole.bonk - dt, 0);
  }

  if (state.timeLeft === 0) {
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextMole -= dt;
  if (state.nextMole <= 0) {
    const empty = state.holes.filter((h) => h.up === 0 && h.bonk === 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
      hole.up = upTime(state);
    }
    state.nextMole = spawnGap(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The hole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) {
      // The mole.
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_RADIUS * 0.7, Math.PI, 0);
      ctx.lineTo(hole.x + HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.lineTo(hole.x - HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(hole.x - 12, hole.y - 8, 5, 0, Math.PI * 2);
      ctx.arc(hole.x + 12, hole.y - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y + 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hole.bonk > 0) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = hole.bonk / BONK_SECONDS;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_RADIUS * (1.2 - hole.bonk), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
