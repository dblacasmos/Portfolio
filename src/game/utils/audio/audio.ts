/* =============================
   FILE: src/game/utils/audio.ts
   ============================= */
import { CFG } from "../../../constants/config";

/**
 * Mezclador de audio con WebAudio cuando está disponible y
 * fallback automático a <audio> HTML si algo falla.
 *
 * API pública compatible con la versión anterior.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;

  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private uiGain: GainNode | null = null;

  private buffers = new Map<string, AudioBuffer>();             // WebAudio
  private htmlCache = new Map<string, HTMLAudioElement>();      // Fallback HTMLAudio

  // Silencios temporales por-clip (segundos absolutos en tiempo de AudioContext o Date.now/1000)
  private squelchUntil = new Map<string, number>();

  // Cola de SFX: instante (AudioContext.currentTime) al que debe empezar el próximo SFX encolado
  private sfxQueueTime = 0;

  // Ducking menú (baja music/sfx, deja UI)
  private menuDepth = 0;
  private savedGains: { music: number; sfx: number } | null = null;

  private globalMuted = false;

  // ===== Helpers =====
  private get AC(): typeof AudioContext | undefined {
    return (typeof window !== "undefined")
      ? ((window as any).AudioContext || (window as any).webkitAudioContext)
      : undefined;
  }

  /** Reconstruye el grafo de nodos sobre un contexto dado. */
  private rebuildGraph(ctx: AudioContext) {
    this.masterGain = ctx.createGain();
    this.musicGain = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.uiGain = ctx.createGain();

    this.masterGain.gain.value = 1.0;
    this.musicGain.gain.value = Math.max(0, Math.min(1, CFG.audio?.musicVolume ?? 0.8));
    this.sfxGain.gain.value = Math.max(0, Math.min(1, CFG.audio?.sfxVolume ?? 0.8));
    this.uiGain.gain.value = Math.max(0, Math.min(1, CFG.audio?.uiVolume ?? 0.9));

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.uiGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    this.sfxQueueTime = ctx.currentTime;
  }

  /** Valida y normaliza URLs de audio; evita reproducir "undefined" o cadenas vacías. */
  private ensureUrl(url?: string): string | null {
    if (typeof url === "string" && url.trim().length > 0) return url;
    // Mensaje útil de DX; así detectas si ASSETS.audio.* viene vacío
    console.warn("[AudioManager] URL vacía/indefinida para audio.");
    return null;
  }

  /** Crea el contexto y nodos si no existen (lazy). */
  private ensureCtx() {
    const AC = this.AC;
    if (!AC) return;
    // Si no existe o quedó "closed", crea uno nuevo y reconstruye el grafo
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        this.ctx = new AC();
      } catch {
        this.ctx = null;
        return;
      }
      this.rebuildGraph(this.ctx);
    }
  }

  /** Desbloquea reproducción en políticas de autoplay (llamar en gestos de usuario). */
  async ensureStarted() {
    this.ensureCtx();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* noop */ }
    } else if (this.ctx.state === "closed") {
      // seguridad extra por si alguien lo cerró externamente
      try {
        const AC = this.AC;
        if (AC) {
          this.ctx = new AC();
          this.rebuildGraph(this.ctx);
        }
      } catch { /* noop */ }
    }
  }

  /** decodeAudioData compatible (Safari/otros). */
  private async decode(arr: ArrayBuffer): Promise<AudioBuffer> {
    this.ensureCtx();
    if (!this.ctx) throw new Error("No AudioContext");
    // Si el motor acepta 1 arg -> devuelve Promise; si no, usamos callbacks.
    if ((this.ctx.decodeAudioData as any).length === 1) {
      return await this.ctx.decodeAudioData(arr);
    }
    return await new Promise<AudioBuffer>((resolve, reject) => {
      (this.ctx as AudioContext).decodeAudioData(
        arr,
        (b) => resolve(b),
        (e) => reject(e)
      );
    });
  }

  /** Preload de un audio (intenta WebAudio y cae a HTMLAudio). */
  async load(url: string) {
    url = this.ensureUrl(url) ?? ("" as any);
    if (!url) return;
    if (this.buffers.has(url) || this.htmlCache.has(url)) return;

    // Intentar WebAudio si existe AudioContext:
    try {
      this.ensureCtx();
      if (this.ctx) {
        const res = await fetch(url);                 // nada de only-if-cached
        const arr = await res.arrayBuffer();
        const buf = await this.decode(arr);
        this.buffers.set(url, buf);
        return;
      }
    } catch {
      // caída al fallback HTML
    }

    // Fallback robusto a <audio>
    const a = new Audio();
    a.src = url;
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      const done = () => {
        a.removeEventListener("canplaythrough", done);
        a.removeEventListener("error", done);
        resolve();
      };
      a.addEventListener("canplaythrough", done, { once: true });
      a.addEventListener("error", done, { once: true });
      a.load();
    });
    this.htmlCache.set(url, a);
  }

  /** Preload de varios audios. */
  async loadMany(urls: string[]) {
    await Promise.all(urls.map((u) => this.load(u).catch(() => { })));
  }

  /** Devuelve la duración del clip si está precargado (segundos), o null si no se conoce. */
  getDuration(url: string): number | null {
    const buf = this.buffers.get(url);
    if (buf) return buf.duration || null;
    const tag = this.htmlCache.get(url);
    if (!tag) return null;
    return Number.isFinite(tag.duration) && tag.duration > 0 ? tag.duration : null;
  }

  /** Silencia (no reproduce) un URL de SFX durante `seconds` desde “ahora”. */
  squelchUrl(url: string, seconds: number) {
    const now = this.ctx ? this.ctx.currentTime : (Date.now() / 1000);
    const until = now + Math.max(0, seconds || 0);
    this.squelchUntil.set(url, until);
  }

  /** Comprueba si una URL está silenciada en este instante. */
  private isSquelched(url: string): boolean {
    const now = this.ctx ? this.ctx.currentTime : (Date.now() / 1000);
    const until = this.squelchUntil.get(url) ?? 0;
    return now < until;
  }

  // ===== Volúmenes =====
  setMusicVol(v: number) { if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, v)); }
  setSfxVol(v: number) { if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v)); }
  setUiVol(v: number) { if (this.uiGain) this.uiGain.gain.value = Math.max(0, Math.min(1, v)); }

  getMusicVol() { return this.musicGain?.gain.value ?? Math.max(0, Math.min(1, CFG.audio?.musicVolume ?? 0.8)); }
  getSfxVol() { return this.sfxGain?.gain.value ?? Math.max(0, Math.min(1, CFG.audio?.sfxVolume ?? 0.8)); }
  getUiVol() { return this.uiGain?.gain.value ?? Math.max(0, Math.min(1, CFG.audio?.uiVolume ?? 0.9)); }

  // ===== Mute global (silencia TODO: music, sfx y ui) =====
  setGlobalMute(muted: boolean) {
    this.globalMuted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }
  isGlobalMuted() { return this.globalMuted; }

  // ===== Reproducción =====
  /** Música (devuelve el source WebAudio si aplica; con fallback devuelve null). */
  playMusic(url: string, loop = true): AudioBufferSourceNode | null {
    url = this.ensureUrl(url) ?? ("" as any);
    if (!url) return null;
    const buf = this.buffers.get(url);
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = loop;
      if (this.musicGain) src.connect(this.musicGain);
      this.ensureStarted();
      try { src.start(); } catch { }
      return src;
    }

    // Fallback HTML
    let base = this.htmlCache.get(url);
    if (!base) {
      // crear on-the-fly si no estaba cacheado
      base = new Audio();
      base.src = url;
      base.preload = "auto";
      base.crossOrigin = "anonymous";
      this.htmlCache.set(url, base);
    }
    if (base) {
      const tag = base.cloneNode(true) as HTMLAudioElement;
      tag.loop = loop;
      tag.muted = this.globalMuted;
      tag.volume = this.globalMuted ? 0 : this.getMusicVol();
      tag.play().catch(() => { });
    }
    return null;
  }

  /**
   * SFX inmediato (no encolado).
   * `volume` = multiplicador por clip (1 = normal). También **resetea** la cola para que
   * el siguiente `playSfxQueued` empiece tras este sonido.
   */
  playSfx(url: string, volume = 1) {
    url = this.ensureUrl(url) ?? ("" as any);
    if (!url) return;
    // No dispares si ese clip está silenciado temporalmente
    if (this.isSquelched(url)) return;
    // asegúrate de tener contexto utilizable
    this.ensureCtx();
    const buf = this.buffers.get(url);
    if (buf && this.ctx) {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      // Ganancia por-instancia para poder subir/bajar este golpe concreto
      const vGain = this.ctx.createGain();
      vGain.gain.value = Math.max(0, volume);
      if (this.sfxGain) vGain.connect(this.sfxGain);
      src.connect(vGain);

      this.ensureStarted();
      try { src.start(now); } catch { }

      // ► Reset/colocar la cola justo tras este clip
      const dur = buf.duration || 0;
      this.sfxQueueTime = now + dur;
      return;
    }

    // Fallback HTML
    let base = this.htmlCache.get(url);
    if (!base) {
      // crear on-the-fly si no estaba cacheado
      base = new Audio();
      base.src = url;
      base.preload = "auto";
      base.crossOrigin = "anonymous";
      this.htmlCache.set(url, base);
    }
    if (base) {
      const tag = base.cloneNode(true) as HTMLAudioElement;
      tag.muted = this.globalMuted;
      tag.volume = this.globalMuted ? 0 : (this.getSfxVol() * Math.max(0, volume));
      tag.play().catch(() => { });

      // Estimar duración para actualizar cola
      const dur = Number.isFinite(tag.duration) && tag.duration > 0 ? tag.duration : (base.duration || 0);
      const now = this.ctx?.currentTime ?? (Date.now() / 1000);
      this.sfxQueueTime = now + (dur || 0);
    }
  }

  /**
   * SFX en **cola**: se programa para comenzar justo después del SFX previo.
   * `volume` = multiplicador por clip (1 = normal).
   */
  playSfxQueued(url: string, volume = 1) {
    url = this.ensureUrl(url) ?? ("" as any);
    if (!url) return;
    // No encolas si ese clip está silenciado temporalmente
    if (this.isSquelched(url)) return;
    this.ensureCtx();
    const buf = this.buffers.get(url);
    if (buf && this.ctx) {
      const now = this.ctx.currentTime;
      const startAt = Math.max(now, this.sfxQueueTime);

      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      // Ganancia por-instancia
      const vGain = this.ctx.createGain();
      vGain.gain.value = Math.max(0, volume);
      if (this.sfxGain) vGain.connect(this.sfxGain);
      src.connect(vGain);

      this.ensureStarted();
      try { src.start(startAt); } catch { }

      // ► avanza la cola al final de este sonido
      const dur = buf.duration || 0;
      this.sfxQueueTime = startAt + dur;
      return;
    }

    // Fallback HTML
    let base = this.htmlCache.get(url);
    if (!base) {
      base = new Audio();
      base.src = url;
      base.preload = "auto";
      base.crossOrigin = "anonymous";
      this.htmlCache.set(url, base);
    }
    if (base) {
      const tag = base.cloneNode(true) as HTMLAudioElement;
      tag.muted = this.globalMuted;

      const baseVol = this.globalMuted ? 0 : this.getSfxVol();
      tag.volume = Math.max(0, Math.min(1, baseVol * Math.max(0, volume)));

      const now = this.ctx?.currentTime ?? (Date.now() / 1000);
      const startAt = Math.max(now, this.sfxQueueTime);
      const delayMs = Math.max(0, (startAt - now) * 1000);

      window.setTimeout(() => tag.play().catch(() => { }), delayMs);

      const dur = Number.isFinite(tag.duration) && tag.duration > 0 ? tag.duration : (base.duration || 0);
      this.sfxQueueTime = startAt + (dur || 0);
    }
  }

  /** Sonidos de UI/menú. */
  playUi(url: string) {
    url = this.ensureUrl(url) ?? ("" as any);
    if (!url) return;
    this.ensureCtx();
    const buf = this.buffers.get(url);
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      if (this.uiGain) src.connect(this.uiGain);
      this.ensureStarted();
      try { src.start(); } catch { }
      return;
    }

    // Fallback HTML
    const base = this.htmlCache.get(url);
    if (base) {
      const tag = base.cloneNode(true) as HTMLAudioElement;
      tag.muted = this.globalMuted;
      tag.volume = this.globalMuted ? 0 : this.getUiVol();
      tag.play().catch(() => { });
    }
  }

  /** SFX en loop (útil para pasos o recarga). Devuelve el source para poder pararlo (HTML fallback devuelve null). */
  playSfxLoop(url: string): AudioBufferSourceNode | null {
    url = this.ensureUrl(url) ?? ("" as any);
    if (!url) return null;
    this.ensureCtx();
    const buf = this.buffers.get(url);
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      if (this.sfxGain) src.connect(this.sfxGain);
      this.ensureStarted();
      try { src.start(); } catch { }
      return src;
    }

    // Fallback HTML
    const base = this.htmlCache.get(url);
    if (base) {
      const tag = base.cloneNode(true) as HTMLAudioElement;
      tag.loop = true;
      tag.muted = this.globalMuted;
      tag.volume = this.globalMuted ? 0 : this.getSfxVol();
      tag.play().catch(() => { });
    }
    return null;
  }

  /** Para y limpia un source loop (sólo WebAudio). */
  stop(source: AudioBufferSourceNode | null | undefined) {
    try { source?.stop(); } catch { }
  }

  // ===== Modo MENÚ: ducking de music/sfx, UI intacto =====
  enterMenuMode(duckMusicTo = 0, duckSfxTo = 0) {
    this.menuDepth++;
    if (this.menuDepth === 1) {
      this.savedGains = {
        music: this.musicGain?.gain.value ?? this.getMusicVol(),
        sfx: this.sfxGain?.gain.value ?? this.getSfxVol(),
      };
      if (this.musicGain) this.musicGain.gain.value = Math.max(0, duckMusicTo);
      if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, duckSfxTo);
      // En HTML fallback los volúmenes se aplican en cada play() con get*Vol()
    }
  }

  exitMenuMode() {
    if (this.menuDepth === 0) return;
    this.menuDepth--;
    if (this.menuDepth === 0 && this.savedGains) {
      if (this.musicGain) this.musicGain.gain.value = this.savedGains.music;
      if (this.sfxGain) this.sfxGain.gain.value = this.savedGains.sfx;
      this.savedGains = null;
    }
  }
}

export const audioManager = new AudioManager();
