import { MODES, type VisualMode } from '@/visualizer/renderers';

const LABELS: Record<VisualMode, string> = {
  radial: 'Radial',
  wave: 'Wave',
  particles: 'Particles',
};

interface ModeTabsProps {
  mode: VisualMode;
  onChange: (mode: VisualMode) => void;
}

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Visual mode">
      {MODES.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          id={`mode-${option}`}
          data-testid={`mode-${option}`}
          aria-selected={mode === option}
          className="mode-tab"
          onClick={() => onChange(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
