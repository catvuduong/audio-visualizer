import { MODES, type VisualMode } from '@/visualizer/renderers';
import { THEME_NAMES, type ThemeName } from './themes';

export interface Prefs {
  mode: VisualMode;
  theme: ThemeName;
  sensitivity: number;
  volume: number;
}

export const DEFAULT_PREFS: Prefs = {
  mode: 'radial',
  theme: 'neon',
  sensitivity: 1,
  volume: 0.8,
};

const STORAGE_KEY = 'audio-visualizer:prefs';

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readStorage(): Prefs {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<keyof Prefs, unknown>>;
    return {
      mode: MODES.find((mode) => mode === stored.mode) ?? DEFAULT_PREFS.mode,
      theme: THEME_NAMES.find((theme) => theme === stored.theme) ?? DEFAULT_PREFS.theme,
      sensitivity: clamp(stored.sensitivity, 0.2, 3, DEFAULT_PREFS.sensitivity),
      volume: clamp(stored.volume, 0, 1, DEFAULT_PREFS.volume),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

// A small external store so components can read the saved preferences with useSyncExternalStore.
// The snapshot is cached so React sees a stable value between updates.
let current: Prefs | null = null;
const listeners = new Set<() => void>();

export function getPrefs(): Prefs {
  current ??= readStorage();
  return current;
}

export function setPrefs(patch: Partial<Prefs>): void {
  current = { ...getPrefs(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be blocked (private mode, disabled site data); the UI still works without it.
  }
  listeners.forEach((listener) => listener());
}

export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
