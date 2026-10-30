export const FFT_SIZE = 512;
export const BIN_COUNT = FFT_SIZE / 2;
export const WAVE_COUNT = FFT_SIZE;

const TAU = Math.PI * 2;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The per-frame data every renderer draws from. It is either read from a live
 * AnalyserNode or, while nothing is playing, synthesised so the idle screen
 * still moves.
 */
export class Signal {
  readonly spectrum = new Float32Array(BIN_COUNT);
  readonly wave = new Float32Array(WAVE_COUNT);
  bass = 0;
  level = 0;

  private readonly bytes = new Uint8Array(BIN_COUNT);
  private readonly samples = new Uint8Array(WAVE_COUNT);

  update(analyser: AnalyserNode | null, time: number, sensitivity: number): void {
    if (analyser) {
      this.readAnalyser(analyser, sensitivity);
    } else {
      this.synthesize(time, sensitivity);
    }
    this.summarise();
  }

  private readAnalyser(analyser: AnalyserNode, sensitivity: number): void {
    analyser.getByteFrequencyData(this.bytes);
    analyser.getByteTimeDomainData(this.samples);
    for (let i = 0; i < BIN_COUNT; i++) {
      this.spectrum[i] = clamp((this.bytes[i] / 255) * sensitivity);
    }
    for (let i = 0; i < WAVE_COUNT; i++) {
      this.wave[i] = clamp(((this.samples[i] - 128) / 128) * sensitivity, -1, 1);
    }
  }

  private synthesize(time: number, sensitivity: number): void {
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(TAU * 0.9 * time), 4);

    for (let i = 0; i < BIN_COUNT; i++) {
      const u = i / BIN_COUNT;
      const shape = Math.pow(1 - u, 1.6) * 0.75 + 0.05;
      const shimmer = 0.5 + 0.5 * Math.sin(time * 1.7 + i * 0.11 + Math.sin(time * 0.6 + i * 0.03) * 2);
      const kick = u < 0.06 ? pulse * 0.6 : 0;
      this.spectrum[i] = clamp((shape * (0.35 + 0.65 * shimmer) + kick) * sensitivity);
    }

    for (let i = 0; i < WAVE_COUNT; i++) {
      const x = i / WAVE_COUNT;
      const y =
        0.5 * Math.sin(TAU * 2 * x + time * 1.3) +
        0.28 * Math.sin(TAU * 5 * x - time * 2.1) +
        0.12 * Math.sin(TAU * 9 * x + time * 0.7);
      this.wave[i] = clamp(y * (0.6 + 0.4 * pulse) * sensitivity, -1, 1);
    }
  }

  private summarise(): void {
    let bass = 0;
    for (let i = 1; i <= 8; i++) bass += this.spectrum[i];
    let level = 0;
    for (let i = 0; i < BIN_COUNT / 2; i++) level += this.spectrum[i];
    this.bass = clamp(bass / 8);
    this.level = clamp(level / (BIN_COUNT / 2));
  }
}
