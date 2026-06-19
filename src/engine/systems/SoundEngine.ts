import { PENTATONIC_HIGH } from '@/engine/constants';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lullabySrc: OscillatorNode | null = null;
  private lullabyGain: GainNode | null = null;
  private lullabyFilter: BiquadFilterNode | null = null;
  private lullabyScheduled = false;
  private paintOsc: OscillatorNode | null = null;
  private paintSub: OscillatorNode | null = null;
  private paintGain: GainNode | null = null;
  private paintPan: StereoPannerNode | null = null;
  private volume = 1.0;

  private _ensure(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private _out(): GainNode {
    this._ensure();
    return this.master!;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setMasterVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  playPop(): void {
    const ctx = this._ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this._out());
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  playTone(freq: number, duration = 0.2, type: OscillatorType = 'sine'): void {
    const ctx = this._ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this._out());
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  playCelebration(): void {
    [880, 1046.5, 1318.5].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25), i * 120);
    });
  }

  playSurpriseRise(): void {
    const ctx = this._ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 1.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
    osc.connect(gain);
    gain.connect(this._out());
    osc.start();
    osc.stop(ctx.currentTime + 1.7);
  }

  playSurpriseExplosion(): void {
    const ctx = this._ensure();
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(120, ctx.currentTime);
    boom.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
    boomGain.gain.setValueAtTime(0.5, ctx.currentTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    boom.connect(boomGain);
    boomGain.connect(this._out());
    boom.start();
    boom.stop(ctx.currentTime + 0.4);
    const sparkle = PENTATONIC_HIGH.slice(0, 7);
    sparkle.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.18), 80 + i * 55);
    });
  }

  playAnimalSound(animal: 'duck' | 'cat' | 'frog' | 'rabbit' | 'star'): void {
    const ctx = this._ensure();
    switch (animal) {
      case 'duck': this._duck(ctx); break;
      case 'cat':  this._cat(ctx); break;
      case 'frog': this._frog(ctx); break;
      case 'rabbit': this.playTone(580, 0.25); break;
      case 'star': [880, 1046.5, 1318.5].forEach((f, i) => setTimeout(() => this.playTone(f, 0.12), i * 60)); break;
    }
  }

  private _duck(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.25);
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 3;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._out());
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  private _cat(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(850, ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(this._out());
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  private _frog(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    lfo.type = 'sine';
    lfo.frequency.value = 20;
    lfoGain.gain.value = 40;
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this._out());
    lfo.start();
    osc.start();
    lfo.stop(ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.25);
  }

  startPaintingTone(freq: number, pan: number): void {
    const ctx = this._ensure();
    this.stopPaintingTone();
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    sub.type = 'sine';
    sub.frequency.value = freq * 0.5;
    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(gain);
    sub.connect(gain);
    gain.connect(panner);
    panner.connect(this._out());
    osc.start();
    sub.start();
    this.paintOsc = osc;
    this.paintSub = sub;
    this.paintGain = gain;
    this.paintPan = panner;
  }

  updatePaintingTone(freq: number, pan: number): void {
    const ctx = this._ensure();
    if (!this.paintOsc || !this.paintSub || !this.paintPan) return;
    this.paintOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.02);
    this.paintSub.frequency.setTargetAtTime(freq * 0.5, ctx.currentTime, 0.02);
    this.paintPan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, 0.02);
  }

  stopPaintingTone(): void {
    const ctx = this._ensure();
    if (this.paintGain) {
      this.paintGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05);
      const g = this.paintGain;
      const o = this.paintOsc;
      const s = this.paintSub;
      setTimeout(() => {
        try { o?.stop(); s?.stop(); } catch { /* ignore */ }
        g.disconnect();
      }, 300);
    }
    this.paintOsc = null;
    this.paintSub = null;
    this.paintGain = null;
    this.paintPan = null;
  }

  startLullaby(): void {
    if (this.lullabyScheduled) return;
    const ctx = this._ensure();
    this.lullabyScheduled = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4000;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2.0);
    filter.connect(gainNode);
    gainNode.connect(this._out());
    this.lullabyGain = gainNode;
    this.lullabyFilter = filter;
    const C4=261.63, D4=293.66, E4=329.63, G4=392, A4=440, R=0;
    const melody = [
      C4,C4,G4,G4,A4,A4,G4,R, F4(),F4(),E4,E4,D4,D4,C4,R,
      G4,G4,F4(),F4(),E4,E4,D4,R, G4,G4,F4(),F4(),E4,E4,D4,R,
      C4,C4,G4,G4,A4,A4,G4,R, F4(),F4(),E4,E4,D4,D4,C4,R,
    ];
    function F4(){ return 349.23; }
    const beat = 0.42;
    let t = ctx.currentTime + 0.5;
    const schedule = (): void => {
      melody.forEach((freq) => {
        if (freq > 0) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0, t);
          g.gain.linearRampToValueAtTime(0.35, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.85);
          o.connect(g);
          g.connect(filter);
          o.start(t);
          o.stop(t + beat);
        }
        t += beat;
      });
      if (this.lullabyScheduled) setTimeout(schedule, (melody.length * beat - 1) * 1000);
    };
    schedule();
  }

  stopLullaby(): void {
    this.lullabyScheduled = false;
    if (this.lullabyGain) {
      const g = this.lullabyGain;
      const ctx = this.ctx;
      if (ctx) g.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 2000);
    }
    this.lullabyGain = null;
    this.lullabySrc = null;
    this.lullabyFilter = null;
  }

  setLowPassCutoff(freq: number): void {
    const ctx = this._ensure();
    if (this.lullabyFilter) {
      this.lullabyFilter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.3);
    }
  }

  fadeOut(duration = 2.0): void {
    const ctx = this._ensure();
    if (this.master) {
      this.master.gain.setTargetAtTime(0, ctx.currentTime, duration / 4);
    }
  }
}
