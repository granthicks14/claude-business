/**
 * The ball, and why it is simulated rather than chosen.
 *
 * WHAT THIS IS NOT
 *
 * It is not a physics engine, and it does not import one. A rigid-body library
 * would be a few hundred kilobytes shipped to every visitor so that a ball can
 * fall two hundred pixels past thirty pegs — and the app's first rule is that
 * the core costs nothing to run, which includes what it costs the person
 * loading it on a phone.
 *
 * It is also not a lookup that picks a slot and then animates a ball towards
 * it. That would be the honest-looking version of a rigged game: the result
 * would be decided before the drop and the motion would be theatre. Here the
 * ball is integrated step by step and the slot is *wherever it ends up*, which
 * is the only arrangement in which "drop the ball" is a true description of
 * what happened.
 *
 * DETERMINISM
 *
 * Every random number comes from a seed, so a drop can be replayed exactly —
 * which is what makes the whole thing testable in the node suite rather than
 * only observable in a browser, and what lets the reduced-motion path compute
 * the identical result without animating anything.
 */

/** A peg, in board coordinates. */
export interface Peg {
  x: number;
  y: number;
  row: number;
}

/** One recorded position of the ball. */
export interface Step {
  x: number;
  y: number;
}

export interface BoardSpec {
  /** Board width in arbitrary units; the SVG viewBox uses the same ones. */
  width: number;
  height: number;
  rows: number;
  /** How many slots along the bottom. */
  slots: number;
  pegRadius: number;
  ballRadius: number;
}

export interface Drop {
  /** Where it landed. Index into the slot row, left to right. */
  slot: number;
  /** The path, for the animation to replay. */
  path: Step[];
  /** Which pegs it actually struck, so they can react. */
  hits: { row: number; index: number; at: number }[];
  seed: number;
}

/**
 * The default board.
 *
 * Ten slots and eleven rows: enough bounce to look like Plinko, few enough
 * pegs that a phone renders it without a canvas. The numbers are units, not
 * pixels — the SVG scales them.
 */
export const DEFAULT_BOARD: BoardSpec = {
  /*
   * WIDER THAN TALL, BECAUSE THE BUTTON HAS TO BE ON THE SAME SCREEN.
   *
   * The first version was 100x108 — near square, which is what a Plinko
   * cabinet looks like and completely wrong here. Rendered at the page's
   * reading width it came out 726px tall, so on a 900px laptop the board
   * filled the viewport and "Drop the ball" sat below the fold: a game whose
   * one instruction is "press this" shipped with the button off screen.
   *
   * These proportions put the whole thing — heading, board, legend and button
   * — inside one screen at 1280x900, which is the only measurement that
   * matters for a page with a single action.
   *
   * The width was then tuned, because widening the board makes the bias worse:
   * the ball has further to travel sideways to reach an edge, so at 148 units
   * the outer slots took 0.33% each — a 70:1 spread, and a slot hit once in
   * three hundred drops is decoration. Eleven rows at 120 units gives 8:1 with
   * every slot reachable. More rows makes it dramatically worse rather than
   * better: at fifteen rows four slots go completely unreachable, which is the
   * binomial tail, not a bug to fix.
   */
  width: 120,
  height: 96,
  rows: 11,
  slots: 10,
  pegRadius: 1.2,
  ballRadius: 2.2,
};

/**
 * A small deterministic generator (mulberry32).
 *
 * `Math.random` cannot be seeded, so a drop could not be replayed, tested or
 * recomputed for the reduced-motion path. Thirty-two bits is ample for
 * bouncing a ball.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Peg positions, in the offset rows a Plinko board actually has.
 *
 * Alternate rows are inset by half a gap, which is what makes a ball leaving
 * one peg arrive at the gap between two others rather than straight down onto
 * the next one.
 */
export function pegs(board: BoardSpec): Peg[] {
  const out: Peg[] = [];
  const gap = board.width / (board.slots + 1);
  const top = board.height * 0.13;
  const usable = board.height * 0.72;

  for (let row = 0; row < board.rows; row++) {
    const offset = row % 2 === 0 ? gap : gap / 2;
    const count = row % 2 === 0 ? board.slots : board.slots + 1;
    const y = top + (usable * row) / (board.rows - 1);
    for (let i = 0; i < count; i++) {
      const x = offset + i * gap;
      if (x > 1 && x < board.width - 1) out.push({ x, y, row });
    }
  }
  return out;
}

/** Where each slot's centre sits, used for both layout and the landing test. */
export function slotCentres(board: BoardSpec): number[] {
  const w = board.width / board.slots;
  return Array.from({ length: board.slots }, (_, i) => w * (i + 0.5));
}

/*
 * TUNED AGAINST MEASUREMENT, NOT AGAINST FEEL.
 *
 * Twelve gravity/restitution pairs were run at 6,000 drops each. The first
 * guess (0.055 / 0.62) looked right and was not: **2.4% of balls never reached
 * the floor** — balanced on a peg with the contact normal near horizontal, so
 * the reflection returned almost no downward speed — and they ran to the step
 * cap, which on screen is a ball that hangs there for ever.
 *
 * A bouncier ball is a stuck ball: every restitution at 0.62 stuck around 130
 * in 6,000 regardless of gravity, and every one at 0.42 stuck 0-3. These
 * values stick **none** in 20,000 and put the median drop at 159 steps with a
 * 99th percentile of 287, which matters because the animation has to finish
 * inside a couple of seconds.
 */
const GRAVITY = 0.18;
const RESTITUTION = 0.42;
/** Sideways damping, so the ball settles instead of skating along the floor. */
const FRICTION = 0.995;
/*
 * A ceiling, not a mechanism. Nothing should reach it — if a change to the
 * constants makes drops hit this, the ball is getting stuck again and
 * `test:plinko` fails rather than the game quietly freezing.
 */
const MAX_STEPS = 1400;

/**
 * Drop a ball and record where it goes.
 *
 * The collision response is deliberately simple: on contact the ball is pushed
 * back out along the line from peg to ball and its velocity reflected about
 * that normal, with a little seeded jitter so two balls entering a peg
 * identically do not leave it identically. Real Plinko is chaotic for exactly
 * that reason — the bounce is far more sensitive to the contact point than
 * anything a player can control — so a small perturbation is closer to the
 * truth than a clean reflection would be.
 */
export function drop(seed: number, board: BoardSpec = DEFAULT_BOARD): Drop {
  const rand = rng(seed);
  const ps = pegs(board);
  const path: Step[] = [];
  const hits: Drop["hits"] = [];

  /*
   * Entry is near the middle but not exactly on it. Starting dead centre on a
   * symmetric board is the one initial condition where the bounce is a
   * coin-flip on floating-point noise rather than on the seed.
   */
  let x = board.width / 2 + (rand() - 0.5) * board.width * 0.06;
  let y = 2;
  let vx = (rand() - 0.5) * 0.35;
  let vy = 0;

  const floor = board.height - board.ballRadius - 1;
  const contact = board.pegRadius + board.ballRadius;

  /*
   * Stall detection, because tuning alone does not close this.
   *
   * The constants below bring stuck balls from 2.4% to roughly 1 in 20,000 —
   * and 1 in 20,000 is still a real person watching a ball sit on a peg until
   * they reload. It happens when a ball comes to rest almost exactly on top of
   * one, where the contact normal is vertical and the reflection returns no
   * sideways speed to roll it off.
   *
   * Balls fall. If this one has not made downward progress in a while, it is
   * nudged off the peg rather than left there. The nudge is drawn from the
   * same seeded generator, so a stalled drop stays reproducible.
   */
  let lowest = y;
  let sinceProgress = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    vy += GRAVITY;
    vx *= FRICTION;
    x += vx;
    y += vy;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const dx = x - p.x;
      const dy = y - p.y;
      /* Cheap reject before the square root — most pegs are nowhere near. */
      if (dx > contact || dx < -contact || dy > contact || dy < -contact) continue;
      const dist = Math.hypot(dx, dy);
      if (dist >= contact || dist === 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      /* Push out of the peg so the next step does not start inside it. */
      x = p.x + nx * contact;
      y = p.y + ny * contact;

      const dot = vx * nx + vy * ny;
      vx = (vx - 2 * dot * nx) * RESTITUTION + (rand() - 0.5) * 0.22;
      vy = (vy - 2 * dot * ny) * RESTITUTION;
      /* A peg never adds upward speed beyond a small hop; it is a peg. */
      if (vy < -0.9) vy = -0.9;
      hits.push({ row: p.row, index: i, at: path.length });
    }

    /* The walls. */
    if (x < board.ballRadius) {
      x = board.ballRadius;
      vx = Math.abs(vx) * RESTITUTION;
    } else if (x > board.width - board.ballRadius) {
      x = board.width - board.ballRadius;
      vx = -Math.abs(vx) * RESTITUTION;
    }

    if (y > lowest + 0.05) {
      lowest = y;
      sinceProgress = 0;
    } else if (++sinceProgress > 40) {
      /* Sideways, and a touch of downward help to break the balance. */
      vx += (rand() - 0.5) * 1.4;
      vy = Math.max(vy, 0.3);
      sinceProgress = 0;
    }

    path.push({ x, y });

    if (y >= floor) {
      y = floor;
      break;
    }
  }

  const centres = slotCentres(board);
  let slot = 0;
  let best = Infinity;
  for (let i = 0; i < centres.length; i++) {
    const d = Math.abs(centres[i] - x);
    if (d < best) {
      best = d;
      slot = i;
    }
  }

  return { slot, path, hits, seed };
}
