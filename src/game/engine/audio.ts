// Every sound is synthesised with Web Audio, so there are no audio files to download.

export type Sfx =
  | "jump"
  | "djump"
  | "rose"
  | "lily"
  | "secret"
  | "boost"
  | "hurt"
  | "stomp"
  | "tap"
  | "reject"
  | "checkpoint"
  | "keepsake"
  | "blip"
  | "caught"
  | "kiss"
  | "click"
  | "buy"
  | "land"
  | "heal"
  | "call"
  | "win";

// Pentatonic-friendly chord loops, one mood per level.
const SONGS: Record<string, { bpm: number; root: number; prog: number[][]; lead: number[] }> = {
  title: { bpm: 76, root: 60, prog: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], lead: [0, 2, 4, 7, 9, 12] },
  mall: { bpm: 92, root: 62, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [9, 12, 16, 19], [7, 11, 14, 17]], lead: [0, 2, 4, 7, 9, 12, 14] },
  station: { bpm: 84, root: 57, prog: [[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [7, 10, 14, 17]], lead: [0, 3, 5, 7, 10, 12] },
  city: { bpm: 88, root: 65, prog: [[0, 4, 7, 11], [2, 5, 9, 12], [4, 7, 11, 14], [5, 9, 12, 16]], lead: [0, 2, 4, 7, 9, 12] },
  rooftop: { bpm: 72, root: 59, prog: [[0, 4, 7, 11], [4, 7, 11, 14], [9, 12, 16, 19], [5, 9, 12, 16]], lead: [0, 4, 7, 9, 11, 12] },
  river: { bpm: 68, root: 64, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [0, 4, 7, 11], [7, 11, 14, 18]], lead: [0, 2, 4, 7, 9, 12] },
  arcade: { bpm: 100, root: 60, prog: [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17]], lead: [0, 4, 7, 12, 16, 19] },
  ending: { bpm: 66, root: 60, prog: [[0, 4, 7, 11], [5, 9, 12, 16], [9, 12, 16, 19], [7, 11, 14, 17]], lead: [0, 4, 7, 11, 12, 16] },
};
export type SongId = keyof typeof SONGS;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Audio {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private master: GainNode | null = null;
  private song: SongId | null = null;
  private songTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  sfxVolume = 0.8;
  musicVolume = 0.5;
  muted = false;

  /** Must be called from a user gesture (iOS). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      // a gentle low-pass keeps the music soft under the effects
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      this.musicBus.connect(lp);
      lp.connect(this.master);
      this.applyVolumes();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume * 0.6, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.32, t, 0.05);
  }

  suspend() {
    void this.ctx?.suspend();
  }
  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  dispose() {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slide?: number; bus?: GainNode | null; attack?: number } = {}) {
    const ctx = this.ctx;
    const bus = opts.bus ?? this.sfxBus;
    if (!ctx || !bus) return;
    const t = opts.at ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? "sine";
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t + dur);
    const v = opts.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, opts: { vol?: number; at?: number; freq?: number; q?: number; type?: BiquadFilterType } = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = opts.at ?? ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? "bandpass";
    f.frequency.value = opts.freq ?? 1200;
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
  }

  play(s: Sfx) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    switch (s) {
      case "jump":
        this.tone(420, 0.16, { type: "triangle", slide: 1.9, vol: 0.18 });
        break;
      case "djump":
        this.tone(560, 0.18, { type: "triangle", slide: 1.8, vol: 0.18 });
        this.tone(840, 0.14, { type: "sine", slide: 1.5, vol: 0.08, at: t + 0.04 });
        break;
      case "land":
        this.noise(0.06, { vol: 0.06, freq: 300, type: "lowpass" });
        break;
      case "rose":
        this.tone(1318, 0.12, { vol: 0.14 });
        this.tone(1760, 0.18, { vol: 0.12, at: t + 0.06 });
        break;
      case "lily":
        [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.22, { vol: 0.12, at: t + i * 0.05 }));
        break;
      case "secret":
        [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => this.tone(f, 0.3, { vol: 0.1, type: "triangle", at: t + i * 0.06 }));
        break;
      case "boost":
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { vol: 0.13, type: "square", at: t + i * 0.05 }));
        break;
      case "heal":
        [659, 880, 1318].forEach((f, i) => this.tone(f, 0.25, { vol: 0.12, at: t + i * 0.07 }));
        break;
      case "hurt":
        this.tone(330, 0.22, { type: "square", slide: 0.5, vol: 0.12 });
        this.noise(0.1, { vol: 0.08, freq: 600 });
        break;
      case "stomp":
        this.tone(220, 0.12, { type: "triangle", slide: 0.5, vol: 0.25 });
        this.noise(0.08, { vol: 0.1, freq: 900 });
        break;
      case "tap":
        // the happy Opal tap-on beep
        this.tone(2637, 0.1, { type: "square", vol: 0.06 });
        break;
      case "reject":
        this.tone(740, 0.12, { type: "square", vol: 0.07 });
        this.tone(740, 0.12, { type: "square", vol: 0.07, at: t + 0.16 });
        break;
      case "checkpoint":
        [784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, { vol: 0.14, type: "triangle", at: t + i * 0.08 }));
        break;
      case "keepsake":
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.5, { vol: 0.12, type: "triangle", at: t + i * 0.07 }));
        this.tone(261, 0.9, { vol: 0.1, at: t + 0.1 });
        break;
      case "blip":
        this.tone(900 + Math.random() * 160, 0.05, { type: "sine", vol: 0.06 });
        break;
      case "caught":
        this.tone(392, 0.18, { type: "square", vol: 0.1 });
        this.tone(311, 0.34, { type: "square", vol: 0.1, at: t + 0.18 });
        break;
      case "kiss":
        this.noise(0.12, { vol: 0.2, freq: 2600, q: 3 });
        this.tone(1200, 0.12, { vol: 0.12, slide: 1.8, at: t + 0.02 });
        break;
      case "click":
        this.tone(660, 0.05, { type: "triangle", vol: 0.1 });
        break;
      case "buy":
        [880, 1175, 1760].forEach((f, i) => this.tone(f, 0.16, { vol: 0.12, at: t + i * 0.05 }));
        break;
      case "call":
        [659, 784, 988].forEach((f, i) => this.tone(f, 0.2, { vol: 0.12, type: "triangle", at: t + i * 0.09 }));
        break;
      case "win":
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, { vol: 0.13, type: "triangle", at: t + i * 0.11 }));
        break;
    }
  }

  playMusic(id: SongId) {
    if (this.song === id) return;
    this.stopMusic();
    this.song = id;
    if (!this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.ctx || this.song !== id) return;
      while (this.nextTime < this.ctx.currentTime + 0.4) this.scheduleStep(id);
      this.songTimer = window.setTimeout(tick, 120);
    };
    tick();
  }

  stopMusic() {
    this.song = null;
    if (this.songTimer) window.clearTimeout(this.songTimer);
    this.songTimer = null;
  }

  private scheduleStep(id: SongId) {
    const song = SONGS[id];
    const eighth = 60 / song.bpm / 2;
    const bar = Math.floor(this.step / 8) % song.prog.length;
    const chord = song.prog[bar];
    const s = this.step % 8;
    const t = this.nextTime;
    const bus = this.musicBus;
    if (s === 0) {
      // soft pad
      for (const n of chord) this.tone(hz(song.root + n - 12), eighth * 8, { type: "triangle", vol: 0.05, at: t, bus, attack: 0.25 });
      this.tone(hz(song.root + chord[0] - 24), eighth * 3, { type: "sine", vol: 0.16, at: t, bus });
    }
    if (s === 4) this.tone(hz(song.root + chord[0] - 24), eighth * 3, { type: "sine", vol: 0.12, at: t, bus });
    // gentle arpeggio
    if (s % 2 === 0) {
      const n = chord[(s / 2 + bar) % chord.length];
      this.tone(hz(song.root + n), eighth * 1.6, { type: "sine", vol: 0.07, at: t, bus });
    }
    // occasional little melody note
    const seed = (this.step * 9301 + 49297) % 233280;
    if (s % 2 === 1 && seed / 233280 > 0.62) {
      const n = song.lead[seed % song.lead.length];
      this.tone(hz(song.root + 12 + n), eighth * 2.2, { type: "triangle", vol: 0.045, at: t, bus });
    }
    this.nextTime += eighth;
    this.step++;
  }
}
