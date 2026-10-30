'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent } from 'react';
import { AudioEngine, type SourceKind } from '@/lib/audio-engine';
import { DEFAULT_PREFS, getPrefs, setPrefs, subscribePrefs } from '@/lib/prefs';
import { Signal } from '@/lib/signal';
import { THEMES, type ThemeName } from '@/lib/themes';
import { RENDERERS } from '@/visualizer/renderers';
import { ControlBar } from './control-bar';
import { MicConsent } from './mic-consent';
import { ModeTabs } from './mode-tabs';

function describe(source: SourceKind | null, playing: boolean, fileName: string | null): string {
  if (!source) return 'Idle preview · press play to hear the demo track';
  if (source === 'demo') return playing ? 'Demo track · synthesised in your browser' : 'Demo track paused';
  if (source === 'mic') return playing ? 'Live from your microphone' : 'Microphone paused';
  return playing ? `Playing ${fileName}` : `${fileName} paused`;
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(file.name);
}

export function AudioVisualizer() {
  // The server renders the defaults; saved preferences apply once the client has hydrated.
  const { mode, theme, sensitivity, volume } = useSyncExternalStore(subscribePrefs, getPrefs, () => DEFAULT_PREFS);
  const [source, setSource] = useState<SourceKind | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micConsentOpen, setMicConsentOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const engineRef = useRef<AudioEngine | null>(null);
  const playingRef = useRef(false);
  const settingsRef = useRef({ mode, theme, sensitivity });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsRef.current = { mode, theme, sensitivity };
  }, [mode, theme, sensitivity]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const signal = new Signal();
    let dpr = 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const started = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const time = (now - started) / 1000;
      const { mode: activeMode, theme: activeTheme, sensitivity: activeSensitivity } = settingsRef.current;
      const analyser = playingRef.current ? (engineRef.current?.analyserNode ?? null) : null;
      signal.update(analyser, time, activeSensitivity);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = THEMES[activeTheme].background;
      context.fillRect(0, 0, width, height);
      RENDERERS[activeMode]({ ctx: context, width, height, time, theme: THEMES[activeTheme], signal });

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const getEngine = () => {
    engineRef.current ??= new AudioEngine();
    return engineRef.current;
  };

  const startSource = async (kind: SourceKind, file?: File) => {
    setError(null);
    try {
      await getEngine().start(kind, file);
      setSource(kind);
      if (file) setFileName(file.name);
      setPlaying(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start audio.');
    }
  };

  const togglePlay = async () => {
    setError(null);
    if (!source) {
      await startSource('demo');
      return;
    }
    try {
      if (playing) {
        await getEngine().pause();
      } else {
        await getEngine().resume();
      }
      setPlaying(!playing);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change playback.');
    }
  };

  const handleVolume = (value: number) => {
    setPrefs({ volume: value });
    engineRef.current?.setVolume(value);
  };

  const loadFile = (file: File) => {
    if (!isAudioFile(file)) {
      setError(`${file.name} is not an audio file.`);
      return;
    }
    void startSource('file', file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    stageRef.current?.requestFullscreen().catch(() => setError('Fullscreen is not available here.'));
  };

  const status = error ?? describe(source, playing, fileName);

  return (
    <div
      ref={stageRef}
      className="stage"
      data-testid="visualizer"
      data-mode={mode}
      data-theme={theme}
      data-playing={playing ? 'true' : 'false'}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes('Files')) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} className="stage-canvas" data-testid="visualizer-canvas" aria-label="Audio visualizer" />

      <header className="topbar">
        <div className="brand">
          <h1>Audio Visualizer</h1>
          <p className="status" role="status" data-testid="status">
            {status}
          </p>
        </div>
        <div className="topbar-actions">
          <ModeTabs mode={mode} onChange={(next) => setPrefs({ mode: next })} />
          <label className="theme-picker">
            <span className="sr-only">Colour theme</span>
            <select
              data-testid="theme-select"
              value={theme}
              onChange={(event) => setPrefs({ theme: event.target.value as ThemeName })}
            >
              {Object.entries(THEMES).map(([name, option]) => (
                <option key={name} value={name}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <ControlBar
        source={source}
        playing={playing}
        volume={volume}
        sensitivity={sensitivity}
        fullscreen={fullscreen}
        onPlayToggle={togglePlay}
        onDemo={() => void startSource('demo')}
        onMic={() => setMicConsentOpen(true)}
        onFile={() => fileInputRef.current?.click()}
        onVolume={handleVolume}
        onSensitivity={(next) => setPrefs({ sensitivity: next })}
        onFullscreen={toggleFullscreen}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        hidden
        data-testid="file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadFile(file);
          event.target.value = '';
        }}
      />

      {micConsentOpen && (
        <MicConsent
          onAllow={() => {
            setMicConsentOpen(false);
            void startSource('mic');
          }}
          onCancel={() => setMicConsentOpen(false)}
        />
      )}

      {dragging && (
        <div className="drop-overlay" data-testid="drop-overlay">
          Drop an audio file to visualise it
        </div>
      )}
    </div>
  );
}
