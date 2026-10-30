import { gradientColor, type Theme } from '@/lib/themes';
import type { Signal } from '@/lib/signal';

export const MODES = ['radial', 'wave', 'particles'] as const;
export type VisualMode = (typeof MODES)[number];

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  /** Size in CSS pixels. The context is already scaled for the device pixel ratio. */
  width: number;
  height: number;
  time: number;
  theme: Theme;
  signal: Signal;
}

const TAU = Math.PI * 2;
const BAR_COUNT = 120;
const LAYERS = 3;
const PARTICLE_COUNT = 700;

export function drawRadial({ ctx, width, height, time, theme, signal }: RenderContext): void {
  const cx = width / 2;
  const cy = height / 2;
  const inner = Math.min(width, height) * 0.2;
  const maxLength = Math.min(width, height) * 0.24;
  const spin = time * 0.08;
  const bins = signal.spectrum.length;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  const halo = ctx.createRadialGradient(cx, cy, inner * 0.6, cx, cy, inner * 1.6);
  halo.addColorStop(0, gradientColor(theme.colors, 0.5, 0.25 + signal.bass * 0.2));
  halo.addColorStop(1, gradientColor(theme.colors, 0.5, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, inner * 1.6, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = gradientColor(theme.colors, 0.5, 0.15);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, TAU);
  ctx.stroke();

  const barWidth = Math.max(2, (TAU * inner) / BAR_COUNT) * 0.55;
  ctx.lineWidth = barWidth;
  for (let i = 0; i < BAR_COUNT; i++) {
    const u = i / BAR_COUNT;
    // Skew towards the low end of the spectrum, where most of the energy is.
    const value = signal.spectrum[Math.min(bins - 1, Math.floor(Math.pow(u, 1.6) * bins * 0.7))];
    const angle = u * TAU + spin;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const length = 4 + value * maxLength;

    ctx.strokeStyle = gradientColor(theme.colors, u, 0.35 + 0.65 * value);
    ctx.beginPath();
    ctx.moveTo(cx + cos * inner, cy + sin * inner);
    ctx.lineTo(cx + cos * (inner + length), cy + sin * (inner + length));
    ctx.stroke();
  }

  ctx.restore();
}

export function drawWave({ ctx, width, height, theme, signal }: RenderContext): void {
  const wave = signal.wave;
  const count = wave.length;
  const midY = height / 2;
  const amplitude = height * 0.3;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';

  const fill = ctx.createLinearGradient(0, midY - amplitude, 0, midY + amplitude);
  fill.addColorStop(0, gradientColor(theme.colors, 0, 0.02));
  fill.addColorStop(0.5, gradientColor(theme.colors, 0.5, 0.2));
  fill.addColorStop(1, gradientColor(theme.colors, 1, 0.02));

  // The ribbon is the area between the waveform and its mirror image.
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * width;
    const y = midY + wave[i] * amplitude;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = count - 1; i >= 0; i--) {
    ctx.lineTo((i / (count - 1)) * width, midY - wave[i] * amplitude);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  for (let layer = 0; layer < LAYERS; layer++) {
    const scale = 1 - layer * 0.25;
    const t = layer / (LAYERS - 1);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * width;
      const y = midY + wave[i] * amplitude * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.shadowColor = gradientColor(theme.colors, t, 1);
    ctx.shadowBlur = 24;
    ctx.strokeStyle = gradientColor(theme.colors, t, 0.95 - layer * 0.25);
    ctx.lineWidth = 3.5 - layer;
    ctx.stroke();
  }

  ctx.restore();
}

interface ParticleField {
  /** Packed as x, y, z, seed for each particle, all in -1..1 except seed. */
  data: Float32Array;
}

let field: ParticleField | null = null;

// Deterministic so every load shows the same field.
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getField(): ParticleField {
  if (!field) {
    const random = mulberry32(7);
    const data = new Float32Array(PARTICLE_COUNT * 4);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const radius = 0.55 + 0.45 * random();
      data[i * 4] = Math.sin(phi) * Math.cos(theta) * radius;
      data[i * 4 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      data[i * 4 + 2] = Math.cos(phi) * radius;
      data[i * 4 + 3] = random();
    }
    field = { data };
  }
  return field;
}

export function drawParticles({ ctx, width, height, time, theme, signal }: RenderContext): void {
  const { data } = getField();
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) * 0.42;
  const bass = signal.bass;
  const spread = 1 + bass * 0.5;
  const rotation = time * 0.12;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const camera = 2.5;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * (0.3 + bass * 0.5));
  core.addColorStop(0, gradientColor(theme.colors, 0.3, 0.12 + bass * 0.25));
  core.addColorStop(1, gradientColor(theme.colors, 0.3, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, scale * (0.3 + bass * 0.5), 0, TAU);
  ctx.fill();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = data[i * 4];
    const y = data[i * 4 + 1];
    const z = data[i * 4 + 2];
    const seed = data[i * 4 + 3];

    // Particles with a higher seed react more strongly to the bass.
    const reach = spread + bass * seed * 0.6;
    const rx = (x * cos + z * sin) * reach;
    const rz = -x * sin + z * cos;
    const ry = y * reach + Math.sin(time * 0.7 + seed * 20) * 0.02;
    const perspective = camera / (camera - rz);

    const px = cx + rx * perspective * scale * 0.9;
    const py = cy + ry * perspective * scale * 0.9;
    const size = (1.1 + 2.4 * seed) * perspective * (1 + bass * 0.8);
    const alpha = Math.min(1, 0.2 + 0.5 * (perspective / 1.6) + bass * 0.3);

    ctx.fillStyle = gradientColor(theme.colors, seed, alpha);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

export const RENDERERS: Record<VisualMode, (rc: RenderContext) => void> = {
  radial: drawRadial,
  wave: drawWave,
  particles: drawParticles,
};
