/**
 * LOOP ENERGETIC WORKOUT AUDIO SYNTHESIZER
 * 128 BPM high-energy electronic workout music engine powered by Web Audio API.
 * Uses rock-solid lookahead scheduling with punchy kicks, crisp snares, upbeat synth bass & arpeggios.
 */

class WorkoutAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private timerId: number | null = null;
  private nextNoteTime: number = 0;
  private current16thNote: number = 0;
  private tempo: number = 128.0; // 128 BPM
  private lookahead: number = 25.0; // ms interval for scheduler checks
  private scheduleAheadTime: number = 0.12; // schedule 120ms in advance for seamless timing

  public async unlockContext(): Promise<AudioContext | null> {
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      if (!this.masterGain && this.ctx) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
      return this.ctx;
    } catch (e) {
      console.warn("AudioContext unlock failed:", e);
      return null;
    }
  }

  // --- SYNTH DRUM SOUND GENERATORS ---
  private scheduleKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Pitch envelope: fast drop from 180Hz to 35Hz for punchy club kick
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.22);

    // Amplitude envelope
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  private scheduleSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    // Tone component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);
    oscGain.gain.setValueAtTime(0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.15);

    // Noise snap component
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private scheduleHiHat(time: number, accent = false) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.35 : 0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  // --- SYNTH BASS & MELODY GENERATORS ---
  private scheduleBass(freq: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);

    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private scheduleSynthLead(freq: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  // --- SCHEDULER ENGINE ---
  private scheduleNotesForStep(step: number, time: number) {
    const stepInBar = step % 16;

    // 1. Kick on 0, 4, 8, 12 (4-on-the-floor beat)
    if (stepInBar % 4 === 0) {
      this.scheduleKick(time);
    }

    // 2. Snare on beats 4 and 12
    if (stepInBar === 4 || stepInBar === 12) {
      this.scheduleSnare(time);
    }

    // 3. Hi-Hats on every 16th note, accented on off-beats
    this.scheduleHiHat(time, stepInBar % 2 === 1);

    // 4. Pumping Bassline (A minor energy progression: A -> F -> C -> G)
    const bar = Math.floor(step / 16) % 4;
    const bassNotes = [110, 87.31, 130.81, 98.0]; // A2, F2, C3, G2
    const currentBass = bassNotes[bar];

    if (stepInBar % 2 === 0) {
      this.scheduleBass(currentBass, time);
    }

    // 5. Energetic Arpeggiated Melody
    const arpScales: { [key: number]: number[] } = {
      0: [440, 523.25, 659.25, 880], // A minor
      1: [349.23, 440, 523.25, 698.46], // F Major
      2: [523.25, 659.25, 783.99, 1046.5], // C Major
      3: [392.0, 493.88, 587.33, 783.99], // G Major
    };
    const scale = arpScales[bar] || arpScales[0];
    const leadNote = scale[stepInBar % scale.length];
    if (stepInBar % 2 === 1) {
      this.scheduleSynthLead(leadNote, time);
    }
  }

  private nextStep() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note advance
    this.current16thNote++;
  }

  private scheduler = () => {
    if (!this.ctx || !this.isPlaying) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNotesForStep(this.current16thNote, this.nextNoteTime);
      this.nextStep();
    }
  };

  public async startMusic(): Promise<boolean> {
    const ctx = await this.unlockContext();
    if (!ctx) return false;

    if (this.isPlaying) return true;

    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    // Run scheduler timer loop
    if (this.timerId) window.clearInterval(this.timerId);
    this.timerId = window.setInterval(this.scheduler, this.lookahead);
    return true;
  }

  public stopMusic() {
    this.isPlaying = false;
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.isPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  public isMusicActive(): boolean {
    return this.isPlaying;
  }

  public playCueBeep(freq = 560, duration = 0.15) {
    this.unlockContext().then((ctx) => {
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    });
  }

  public playCelebrationChime() {
    this.playCueBeep(587.33, 0.15);
    setTimeout(() => this.playCueBeep(739.99, 0.2), 150);
    setTimeout(() => this.playCueBeep(880, 0.4), 320);
  }
}

export const workoutAudio = new WorkoutAudioEngine();
