import type { ReactNode } from 'react';
import type { SourceKind } from '@/lib/audio-engine';

interface ControlBarProps {
  source: SourceKind | null;
  playing: boolean;
  volume: number;
  sensitivity: number;
  fullscreen: boolean;
  onPlayToggle: () => void;
  onDemo: () => void;
  onMic: () => void;
  onFile: () => void;
  onVolume: (value: number) => void;
  onSensitivity: (value: number) => void;
  onFullscreen: () => void;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      {children}
    </svg>
  );
}

export function ControlBar({
  source,
  playing,
  volume,
  sensitivity,
  fullscreen,
  onPlayToggle,
  onDemo,
  onMic,
  onFile,
  onVolume,
  onSensitivity,
  onFullscreen,
}: ControlBarProps) {
  return (
    <div className="control-bar" data-testid="control-bar">
      <div className="source-group" role="group" aria-label="Audio source">
        <button
          type="button"
          data-testid="source-demo"
          aria-pressed={source === 'demo'}
          onClick={onDemo}
        >
          Demo
        </button>
        <button
          type="button"
          data-testid="source-mic"
          aria-pressed={source === 'mic'}
          onClick={onMic}
        >
          Mic
        </button>
        <button
          type="button"
          data-testid="source-file"
          aria-pressed={source === 'file'}
          onClick={onFile}
        >
          File
        </button>
      </div>

      <button
        type="button"
        className="play-button"
        data-testid="play-toggle"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={onPlayToggle}
      >
        {playing ? (
          <Icon>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </Icon>
        ) : (
          <Icon>
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
          </Icon>
        )}
      </button>

      <label className="slider">
        <span aria-hidden="true">
          <Icon>
            <path d="M5 9v6h3.5L13 19V5L8.5 9H5zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
          </Icon>
        </span>
        <span className="sr-only">Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          data-testid="volume"
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </label>

      <label className="slider">
        <span className="slider-label">Sensitivity</span>
        <input
          type="range"
          min={0.2}
          max={3}
          step={0.05}
          value={sensitivity}
          data-testid="sensitivity"
          onChange={(event) => onSensitivity(Number(event.target.value))}
        />
      </label>

      <button
        type="button"
        className="icon-button"
        data-testid="fullscreen-toggle"
        aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={onFullscreen}
      >
        <Icon>
          {fullscreen ? (
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
          ) : (
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          )}
        </Icon>
      </button>
    </div>
  );
}
