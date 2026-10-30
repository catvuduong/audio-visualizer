const BPM = 76;
const BEAT = 60 / BPM;
const BEATS_PER_CHORD = 8;
const LOOKAHEAD = 1;

// Am7, Fmaj7, Cmaj7, G: each row is one voice per pad oscillator.
const CHORDS = [
  [220, 261.63, 329.63, 392],
  [174.61, 220, 261.63, 329.63],
  [261.63, 329.63, 392, 493.88],
  [196, 246.94, 293.66, 392],
];

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function scheduleKick(context: AudioContext, output: AudioNode, time: number): void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.18);
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.connect(gain).connect(output);
  osc.start(time);
  osc.stop(time + 0.42);
}

function scheduleHat(context: AudioContext, output: AudioNode, noise: AudioBuffer, time: number): void {
  const source = context.createBufferSource();
  const highpass = context.createBiquadFilter();
  const gain = context.createGain();
  highpass.type = 'highpass';
  highpass.frequency.value = 6000;
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  source.buffer = noise;
  source.connect(highpass).connect(gain).connect(output);
  source.start(time);
  source.stop(time + 0.08);
}

/**
 * Synthesises an ambient loop in the browser: a slowly filtered pad that moves
 * through four chords, plus a kick on every beat and hats on the off-beats.
 * Returns a function that stops the loop.
 */
export function startDemoTrack(context: AudioContext, destination: AudioNode): () => void {
  const bus = context.createGain();
  bus.gain.value = 0.8;
  bus.connect(destination);

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  filter.connect(bus);

  const lfo = context.createOscillator();
  const lfoDepth = context.createGain();
  lfo.frequency.value = 0.07;
  lfoDepth.gain.value = 500;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();

  const pad = context.createGain();
  pad.gain.value = 0.08;
  pad.connect(filter);

  const voices = CHORDS[0].map((frequency, i) => {
    const osc = context.createOscillator();
    osc.type = i % 2 ? 'triangle' : 'sawtooth';
    osc.frequency.value = frequency;
    osc.detune.value = (i - 1.5) * 7;
    osc.connect(pad);
    osc.start();
    return osc;
  });

  const noise = createNoiseBuffer(context);
  let beat = 0;
  let nextBeatTime = context.currentTime + 0.1;

  const schedule = () => {
    while (nextBeatTime < context.currentTime + LOOKAHEAD) {
      const time = nextBeatTime;
      if (beat % BEATS_PER_CHORD === 0) {
        const chord = CHORDS[Math.floor(beat / BEATS_PER_CHORD) % CHORDS.length];
        voices.forEach((voice, i) => voice.frequency.setTargetAtTime(chord[i], time, 0.35));
      }
      scheduleKick(context, bus, time);
      if (beat % 2 === 1) scheduleHat(context, bus, noise, time + BEAT / 2);
      beat++;
      nextBeatTime += BEAT;
    }
  };

  schedule();
  const timer = setInterval(schedule, 100);

  return () => {
    clearInterval(timer);
    voices.forEach((voice) => voice.stop());
    lfo.stop();
    // Cutting the bus silences anything already scheduled.
    bus.disconnect();
  };
}
