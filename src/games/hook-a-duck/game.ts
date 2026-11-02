import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 8;
export const DUCK_RADIUS = 22;
/** Pixels per second the hook moves, down or up. */
export const HOOK_SPEED = 420;
/** Where the hook hangs from the rod between casts. */
export const ROD_Y = 70;
/** How far the hook drops before it gives up and comes back. */
export const HOOK_BOTTOM = HEIGHT - 50;
/** The stream: an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 290, rx: 320, ry: 110 } as const;
/** Laps of the stream per second. */
const DRIFT = 0.04;
/** The number on each duck's base, in order round the stream. */
export const DUCK_VALUES = [10, 20, 10, 50, 10, 20, 10, 100] as const;

export interface Duck {
  /** Position round the stream, from 0 to 1. */
  t: number;
  value: number;
}

export interface Hook {
  x: number;
  y: number;
  motion: 'idle' | 'down' | 'up';
  /** The index of the duck on the hook, if any. */
  duck: number | null;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({ t: i / DUCK_VALUES.length, value }));
  return {
    ducks,
    hook: { x: WIDTH / 2, y: ROD_Y, motion: 'idle', duck: null },
    casts: CASTS,
    score: 0,
    phase: 'playing',
  };
}

/** Where a duck is on the canvas. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  const angle = duck.t * Math.PI * 2;
  return { x: STREAM.x + Math.cos(angle) * STREAM.rx, y: STREAM.y + Math.sin(angle) * STREAM.ry };
}

export function isCaught(hook: Hook, duck: Duck): boolean {
  const { x, y } = duckPosition(duck);
  return Math.hypot(hook.x - x, hook.y - y) <= DUCK_RADIUS;
}

/** Moves the rod along the booth. The hook only moves while it is up. */
export function moveHook(state: HookADuckState, x: number): void {
  if (state.hook.motion !== 'idle') return;
  state.hook.x = Math.max(0, Math.min(WIDTH, x));
}

/** Lowers the hook at `x`. Returns false if no cast was made. */
export function cast(state: HookADuckState, x: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook.motion !== 'idle') return false;
  moveHook(state, x);
  state.hook.motion = 'down';
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  const { hook } = state;

  state.ducks.forEach((duck, i) => {
    if (i !== hook.duck) duck.t = (duck.t + DRIFT * dt) % 1;
  });

  if (hook.motion === 'down') {
    hook.y = Math.min(hook.y + HOOK_SPEED * dt, HOOK_BOTTOM);
    const caught = state.ducks.findIndex((duck) => isCaught(hook, duck));
    if (caught !== -1) {
      hook.duck = caught;
      state.score += state.ducks[caught].value;
      hook.motion = 'up';
    } else if (hook.y === HOOK_BOTTOM) {
      hook.motion = 'up';
    }
  } else if (hook.motion === 'up') {
    hook.y = Math.max(hook.y - HOOK_SPEED * dt, ROD_Y);
    if (hook.y === ROD_Y) {
      // Put the duck back in the stream where it was hooked.
      hook.duck = null;
      hook.motion = 'idle';
    }
  }

  if (state.casts === 0 && hook.motion === 'idle') state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, value: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.55, y - DUCK_RADIUS * 0.75, DUCK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.fillRect(x + DUCK_RADIUS * 0.9, y - DUCK_RADIUS * 0.8, DUCK_RADIUS * 0.4, DUCK_RADIUS * 0.2);
  ctx.fillStyle = colors.background;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(String(value), x - DUCK_RADIUS * 0.15, y + 5);
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState) {
  const { colors } = theme;
  const { hook } = state;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream, with a wooden island in the middle.
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 56;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 40, STREAM.ry - 40, 0, 0, Math.PI * 2);
  ctx.fill();

  state.ducks.forEach((duck, i) => {
    if (i === hook.duck) return;
    const { x, y } = duckPosition(duck);
    drawDuck(ctx, x, y, duck.value);
  });

  // Rod along the top, line and hook.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, ROD_Y - 24, WIDTH, 8);
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, ROD_Y - 16);
  ctx.lineTo(hook.x, hook.y);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x - 6, hook.y, 6, 0, Math.PI);
  ctx.stroke();
  if (hook.duck !== null) {
    drawDuck(ctx, hook.x, hook.y + DUCK_RADIUS, state.ducks[hook.duck].value);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description:
    'Lower your hook to catch a rubber duck as it floats by. Each duck scores its number.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onMove = (event: PointerEvent) => moveHook(state, toCanvasX(event));
    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        cast(state, toCanvasX(event));
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
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
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

export default hookADuck;
