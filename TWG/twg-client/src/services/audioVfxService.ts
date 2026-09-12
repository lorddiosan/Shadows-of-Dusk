import { WorldPoint } from '../types/game';

// ==========================================
// Web Audio API Procedural Synthesizer
// Zero external assets required — 100% reliable offline
// ==========================================

class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- 1. SHOOTING SFX ---
  public playShoot(variant: 'ballistic' | 'laser' | 'plasma' = 'ballistic') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (variant === 'laser') {
      // High-tech laser blast (exponential saw frequency dive)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(3, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);

    } else if (variant === 'plasma') {
      // Heavy energy plasma shot (dual detuned oscillator + sub rumble)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(320, now);
      osc2.frequency.setValueAtTime(314, now);
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.28);
      osc2.frequency.exponentialRampToValueAtTime(55, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.31);
      osc2.stop(now + 0.31);

    } else {
      // Heavy Ballistic Cannon / Rifle (transient punch + noise burst)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);

      // Noise crack
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
    }
  }

  // --- 2. FIGHT (MELEE) SFX ---
  public playFight(variant: 'slash' | 'crush' | 'claws' = 'slash') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (variant === 'crush') {
      // Heavy blunt impact / hammer shock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.25);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);

    } else if (variant === 'claws') {
      // Rapid tearing claw swipe
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.linearRampToValueAtTime(210, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);

    } else {
      // Blade slash / metallic cleave (*SCHWING*)
      const bufferSize = ctx.sampleRate * 0.16;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(1100, now + 0.16);
      filter.Q.setValueAtTime(4.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

      // Metallic high ring
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    }
  }

  // --- 3. ABILITY SFX ---
  public playAbility(variant: 'command' | 'holy' | 'blood' | 'gain_cp' = 'command') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (variant === 'gain_cp') {
      // Bright sparkling double-tone chime
      [880, 1320, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });

    } else if (variant === 'holy') {
      // Shimmering celestial chord (Astraea / Aegis)
      [523.25, 659.25, 783.99, 1046.50].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.62);
      });

    } else if (variant === 'blood') {
      // Dark resonant Blood-Alchemical overdrive surge
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.45);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);

    } else {
      // Brassy tactical command fanfare / war cry
      [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.05;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.36);
      });
    }
  }
}

export const soundEffects = new AudioSynthEngine();

// ==========================================
// VFX Event Dispatcher & Listener
// ==========================================

export interface VfxEvent {
  id: string;
  type: 'shoot_projectile' | 'melee_slash' | 'ability_aura' | 'cp_sparkle';
  from?: WorldPoint;
  to?: WorldPoint;
  position?: WorldPoint;
  color?: string;
  secondaryColor?: string;
  variant?: string;
  icon?: string;
  label?: string;
  durationMs?: number;
}

type VfxSubscriber = (event: VfxEvent) => void;

class VfxEventDispatcher {
  private subscribers: Set<VfxSubscriber> = new Set();

  public subscribe(cb: VfxSubscriber): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  public trigger(event: Omit<VfxEvent, 'id'>) {
    const fullEvent: VfxEvent = {
      ...event,
      id: `vfx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    this.subscribers.forEach(cb => {
      try {
        cb(fullEvent);
      } catch (err) {
        console.error('Vfx error:', err);
      }
    });
  }

  // Quick helper triggers:
  public triggerShoot(from: WorldPoint, to: WorldPoint, variant: 'ballistic' | 'laser' | 'plasma' = 'ballistic') {
    const color = variant === 'laser' ? '#38bdf8' : variant === 'plasma' ? '#a855f7' : '#f59e0b';
    this.trigger({
      type: 'shoot_projectile',
      from,
      to,
      variant,
      color,
      durationMs: 400
    });
    soundEffects.playShoot(variant);
  }

  public triggerFight(targetPos: WorldPoint, variant: 'slash' | 'crush' | 'claws' = 'slash') {
    const color = variant === 'crush' ? '#f59e0b' : variant === 'claws' ? '#ef4444' : '#fbbf24';
    this.trigger({
      type: 'melee_slash',
      position: targetPos,
      variant,
      color,
      durationMs: 450
    });
    soundEffects.playFight(variant);
  }

  public triggerAbility(
    pos: WorldPoint,
    icon: string = '⚡',
    label: string = 'Ability Activated',
    variant: 'command' | 'holy' | 'blood' | 'gain_cp' | 'arcane' | 'laser' | 'plasma' | 'slash' | 'crush' = 'command'
  ) {
    const color = 
      variant === 'holy' ? '#38bdf8' : 
      variant === 'blood' ? '#e11d48' : 
      variant === 'gain_cp' ? '#fbbf24' : 
      variant === 'arcane' ? '#a855f7' :
      variant === 'plasma' ? '#f97316' :
      variant === 'laser' ? '#22d3ee' :
      '#f59e0b';
    this.trigger({
      type: variant === 'gain_cp' ? 'cp_sparkle' : 'ability_aura',
      position: pos,
      icon,
      label,
      variant,
      color,
      durationMs: 800
    });
    soundEffects.playAbility(variant === 'gain_cp' || variant === 'holy' || variant === 'blood' ? variant : 'command');
  }
}

export const vfxDispatcher = new VfxEventDispatcher();
