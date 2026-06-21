/**
 * Single-voice audio controller using the Web Audio API.
 *
 * The 400ms SSML silence prefix in googleTts.ts handles hardware cold-start:
 * the OS driver finishes initialising during the silence, so the first spoken
 * word plays cleanly. The keep-alive oscillator here prevents the driver from
 * going idle between consecutive plays (after the first gesture).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private stopRequested = false;
  private keepAlive: OscillatorNode | null = null;

  private getContext(): AudioContext {
    if (typeof window === 'undefined') {
      throw new Error('AudioContext requires a browser environment');
    }
    const AudioCtx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  /** Call synchronously within a user gesture to unlock the AudioContext. */
  unlockWithGesture(): void {
    if (typeof window === 'undefined') return;
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        void ctx.resume().then(() => this.startKeepAlive(ctx));
      } else {
        this.startKeepAlive(ctx);
      }
    } catch {
      // Best-effort.
    }
  }

  async play(base64: string, onEnded?: () => void): Promise<boolean> {
    this.stop();
    this.stopRequested = false;

    if (typeof window === 'undefined') return false;

    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
        this.startKeepAlive(ctx);
      }

      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const decoded = await ctx.decodeAudioData(bytes.buffer);

      if (this.stopRequested) return false;

      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      this.currentSource = source;

      source.addEventListener('ended', () => {
        if (this.currentSource === source) this.currentSource = null;
        onEnded?.();
      }, { once: true });

      source.start(ctx.currentTime);
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.stopRequested = true;
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Already stopped or disconnected.
      }
      this.currentSource = null;
    }
  }

  get isPlaying(): boolean {
    return this.currentSource !== null;
  }

  private startKeepAlive(ctx: AudioContext): void {
    if (this.keepAlive) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.00001; // −100 dB — inaudible
      const osc = ctx.createOscillator();
      osc.frequency.value = 1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      this.keepAlive = osc;
    } catch {
      // Best-effort.
    }
  }
}
