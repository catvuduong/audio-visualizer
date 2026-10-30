import { startDemoTrack } from './demo-track';
import { FFT_SIZE } from './signal';

export type SourceKind = 'demo' | 'mic' | 'file';

interface Graph {
  context: AudioContext;
  analyser: AnalyserNode;
  /** Gate between the analyser and the speakers. Closed for the mic to avoid feedback. */
  speakers: GainNode;
  volume: GainNode;
}

/**
 * Owns the Web Audio graph: source -> analyser -> speakers gate -> volume -> output.
 * The AudioContext is created lazily, on the first user action, because browsers
 * block audio that starts without a gesture.
 */
export class AudioEngine {
  private graph: Graph | null = null;
  private stopSource: (() => void) | null = null;
  private generation = 0;
  private volume = 0.8;

  get analyserNode(): AnalyserNode | null {
    return this.graph?.analyser ?? null;
  }

  async start(kind: SourceKind, file?: File): Promise<void> {
    const generation = ++this.generation;
    this.stop();

    const graph = this.ensureGraph();
    if (graph.context.state === 'suspended') await graph.context.resume();

    if (kind === 'demo') {
      graph.speakers.gain.value = 1;
      this.stopSource = startDemoTrack(graph.context, graph.analyser);
    } else if (kind === 'mic') {
      await this.startMicrophone(graph, generation);
    } else {
      if (!file) throw new Error('No audio file selected.');
      await this.startFile(graph, file, generation);
    }
  }

  async pause(): Promise<void> {
    await this.graph?.context.suspend();
  }

  async resume(): Promise<void> {
    await this.graph?.context.resume();
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.graph) {
      this.graph.volume.gain.setTargetAtTime(value, this.graph.context.currentTime, 0.02);
    }
  }

  stop(): void {
    this.stopSource?.();
    this.stopSource = null;
  }

  dispose(): void {
    this.stop();
    void this.graph?.context.close();
    this.graph = null;
  }

  private ensureGraph(): Graph {
    if (!this.graph) {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.82;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -15;

      const speakers = context.createGain();
      const volume = context.createGain();
      volume.gain.value = this.volume;

      analyser.connect(speakers).connect(volume).connect(context.destination);
      this.graph = { context, analyser, speakers, volume };
    }
    return this.graph;
  }

  private async startMicrophone(graph: Graph, generation: number): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const input = graph.context.createMediaStreamSource(stream);
    input.connect(graph.analyser);
    graph.speakers.gain.value = 0;
    this.stopSource = () => {
      input.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    };
  }

  private async startFile(graph: Graph, file: File, generation: number): Promise<void> {
    const buffer = await graph.context.decodeAudioData(await file.arrayBuffer());
    if (generation !== this.generation) return;

    const source = graph.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(graph.analyser);
    source.start();
    graph.speakers.gain.value = 1;
    this.stopSource = () => {
      source.stop();
      source.disconnect();
    };
  }
}
