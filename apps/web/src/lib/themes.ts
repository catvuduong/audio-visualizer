export interface Theme {
  label: string;
  background: string;
  colors: readonly string[];
}

export const THEMES = {
  neon: {
    label: 'Neon',
    background: '#05030a',
    colors: ['#ff2e88', '#8b5cff', '#00e5ff'],
  },
  sunset: {
    label: 'Sunset',
    background: '#120608',
    colors: ['#ff5f3a', '#ff2e63', '#ffc145'],
  },
  ocean: {
    label: 'Ocean',
    background: '#03101a',
    colors: ['#00c6ff', '#0072ff', '#00f5d4'],
  },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Samples the theme gradient at `t` (0..1) and returns an rgba() string. */
export function gradientColor(colors: readonly string[], t: number, alpha = 1): string {
  const position = Math.min(0.9999, Math.max(0, t)) * (colors.length - 1);
  const index = Math.floor(position);
  const fraction = position - index;
  const from = hexToRgb(colors[index]);
  const to = hexToRgb(colors[Math.min(index + 1, colors.length - 1)]);
  const [r, g, b] = from.map((channel, i) => Math.round(channel + (to[i] - channel) * fraction));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
