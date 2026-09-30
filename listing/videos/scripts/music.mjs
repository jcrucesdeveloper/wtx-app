// Original soundtrack + sound design, synthesized from scratch in plain JS —
// no samples, no third-party music, so there is nothing to license and no
// Content ID claim can land on the YouTube/Play upload (Google Play refuses
// promo videos with monetization/copyright claims; Apple rejects previews
// with unlicensed music).
//
// 120 BPM in A minor (Am–F–C–G). At 120 BPM one beat is exactly 15 frames
// at 30 fps, so every musical hit sits on a whole frame.
//
// A composition describes its arrangement as sections ({ at, bars, part })
// plus one-shot cues ({ t, type }); see engine.js `ctx.music()` / `ctx.sfx()`.

import { writeFileSync } from 'node:fs'

const SR = 48000

/* ---------- DSP building blocks ---------- */

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(0x5eed)
const noise = () => rand() * 2 - 1

/** RBJ biquad; `set()` may be called per block for sweeps. */
class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type
    this.x1 = this.x2 = this.y1 = this.y2 = 0
    this.set(freq, q)
  }
  set(freq, q = this.q) {
    this.q = q
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR
    const cos = Math.cos(w)
    const alpha = Math.sin(w) / (2 * q)
    let b0, b1, b2
    if (this.type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
    else if (this.type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
    else [b0, b1, b2] = [alpha, 0, -alpha]
    const a0 = 1 + alpha
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = (-2 * cos) / a0
    this.a2 = (1 - alpha) / a0
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

function polyblep(t, dt) {
  if (t < dt) {
    t /= dt
    return t + t - t * t - 1
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt
    return t * t + t + t + 1
  }
  return 0
}

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12)

/* ---------- the mix bus ---------- */

class Mix {
  constructor(seconds) {
    const n = Math.ceil(seconds * SR)
    this.n = n
    this.L = new Float32Array(n)
    this.R = new Float32Array(n)
    this.revL = new Float32Array(n)
    this.revR = new Float32Array(n)
    this.dlyL = new Float32Array(n)
    this.dlyR = new Float32Array(n)
    this.duck = new Float32Array(n).fill(1)
  }
  /** Adds a mono voice `fn(i, t)` starting at `t0` for `dur` s, panned, with sends. */
  voice(t0, dur, fn, { gain = 1, pan = 0, rev = 0, dly = 0, duck = 0 } = {}) {
    const start = Math.round(t0 * SR)
    const len = Math.round(dur * SR)
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4)
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4)
    for (let i = 0; i < len; i++) {
      const k = start + i
      if (k < 0) continue
      if (k >= this.n) break
      let s = fn(i, i / SR)
      if (duck) s *= 1 - duck + duck * this.duck[k]
      const l = s * gl
      const r = s * gr
      this.L[k] += l
      this.R[k] += r
      if (rev) {
        this.revL[k] += l * rev
        this.revR[k] += r * rev
      }
      if (dly) {
        this.dlyL[k] += l * dly
        this.dlyR[k] += r * dly
      }
    }
  }
  /** Sidechain envelope: dips after every kick so pads/bass breathe with it. */
  addDuck(t0, depth = 0.7, release = 0.16) {
    const start = Math.round(t0 * SR)
    for (let i = 0; i < SR * 0.5; i++) {
      const k = start + i
      if (k >= this.n) break
      const g = 1 - depth * Math.exp(-i / SR / release)
      this.duck[k] = Math.min(this.duck[k], g)
    }
  }
  finish({ beat }) {
    // Ping-pong dotted-eighth delay.
    const d = Math.round(beat * 0.75 * SR)
    for (let k = d; k < this.n; k++) {
      this.dlyL[k] += this.dlyR[k - d] * 0.42
      this.dlyR[k] += this.dlyL[k - d] * 0.42
    }
    for (let k = d; k < this.n; k++) {
      this.L[k] += this.dlyR[k - d] * 0.5
      this.R[k] += this.dlyL[k - d] * 0.5
      this.revL[k] += this.dlyR[k - d] * 0.15
      this.revR[k] += this.dlyL[k - d] * 0.15
    }
    // Freeverb-style room.
    const wetL = reverb(this.revL, [1557, 1617, 1491, 1422, 1277, 1356], [225, 556])
    const wetR = reverb(this.revR, [1580, 1640, 1514, 1445, 1300, 1379], [248, 579])
    for (let k = 0; k < this.n; k++) {
      this.L[k] += wetL[k] * 0.3
      this.R[k] += wetR[k] * 0.3
    }
    // Bus glue: soft saturation, then peak-normalize (loudness is set at encode time).
    let peak = 0
    for (let k = 0; k < this.n; k++) {
      this.L[k] = Math.tanh(this.L[k] * 1.1)
      this.R[k] = Math.tanh(this.R[k] * 1.1)
      peak = Math.max(peak, Math.abs(this.L[k]), Math.abs(this.R[k]))
    }
    const g = peak > 0 ? 0.89 / peak : 1
    // 8 ms fades so nothing clicks at the edges.
    const fade = Math.round(0.008 * SR)
    for (let k = 0; k < this.n; k++) {
      const edge = Math.min(1, k / fade, (this.n - 1 - k) / fade)
      this.L[k] *= g * edge
      this.R[k] *= g * edge
    }
  }
}

function reverb(input, combs, allpasses) {
  const out = new Float32Array(input.length)
  const scale = SR / 44100
  for (const len0 of combs) {
    const len = Math.round(len0 * scale * 1.6)
    const buf = new Float32Array(len)
    let idx = 0
    let store = 0
    for (let k = 0; k < input.length; k++) {
      const y = buf[idx]
      store = y * 0.75 + store * 0.25 // damping
      buf[idx] = input[k] + store * 0.86 // room size
      idx = (idx + 1) % len
      out[k] += y / combs.length
    }
  }
  for (const len0 of allpasses) {
    const len = Math.round(len0 * scale)
    const buf = new Float32Array(len)
    let idx = 0
    for (let k = 0; k < out.length; k++) {
      const b = buf[idx]
      const y = -out[k] + b
      buf[idx] = out[k] + b * 0.5
      idx = (idx + 1) % len
      out[k] = y
    }
  }
  return out
}

/* ---------- instruments ---------- */

const inst = {
  kick(mix, t, g = 1) {
    let phase = 0
    mix.voice(t, 0.5, (i, s) => {
      const f = 44 + 120 * Math.exp(-s / 0.03)
      phase += (2 * Math.PI * f) / SR
      const body = Math.sin(phase) * Math.exp(-s / 0.3)
      const click = noise() * Math.exp(-s / 0.0025) * 0.35
      return Math.tanh((body + click) * 1.8) * 0.9
    }, { gain: g })
    mix.addDuck(t)
  },
  clap(mix, t, g = 1) {
    const bp = new Biquad('bp', 1500, 0.9)
    mix.voice(t, 0.4, (i, s) => {
      const burst = [0, 0.009, 0.019].reduce((a, o) => a + (s >= o ? Math.exp(-(s - o) / 0.004) : 0), 0)
      const env = burst * 0.8 + Math.exp(-s / 0.14) * 0.5
      return bp.run(noise()) * env * 1.6
    }, { gain: 0.55 * g, rev: 0.35 })
  },
  hat(mix, t, { open = false, g = 1, pan = 0.15 } = {}) {
    const hp = new Biquad('hp', 7500, 0.8)
    mix.voice(t, open ? 0.3 : 0.08, (i, s) => hp.run(noise()) * Math.exp(-s / (open ? 0.11 : 0.022)), {
      gain: (open ? 0.2 : 0.16) * g,
      pan,
      rev: 0.05,
    })
  },
  bass(mix, t, dur, midi, g = 1) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', 700, 0.9)
    let ph = 0
    mix.voice(t, dur + 0.05, (i, s) => {
      ph = (ph + f / SR) % 1
      const saw = 2 * ph - 1 - polyblep(ph, f / SR)
      const sub = Math.sin(2 * Math.PI * ph)
      lp.set(250 + 900 * Math.exp(-s / 0.08))
      const env = Math.min(1, s / 0.004) * (s > dur ? Math.exp(-(s - dur) / 0.015) : 1)
      return (lp.run(saw) * 0.55 + sub * 0.7) * env
    }, { gain: 0.42 * g, duck: 0.85 })
  },
  pluck(mix, t, midi, { g = 1, cutoff = 4200, pan = 0, dly = 0.35 } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', cutoff, 1.2)
    let p1 = 0
    let p2 = 0.37
    mix.voice(t, 0.5, (i, s) => {
      p1 = (p1 + f / SR) % 1
      p2 = (p2 + (f * 1.006) / SR) % 1
      const osc = 2 * p1 - 1 - polyblep(p1, f / SR) + (2 * p2 - 1 - polyblep(p2, (f * 1.006) / SR))
      if (i % 32 === 0) lp.set(300 + cutoff * Math.exp(-s / 0.09))
      return lp.run(osc) * Math.exp(-s / 0.16) * Math.min(1, s / 0.002)
    }, { gain: 0.13 * g, pan, rev: 0.25, dly, duck: 0.4 })
  },
  pad(mix, t, dur, midis, { g = 1, cutoff = 1800 } = {}) {
    midis.forEach((m, n) => {
      for (const [det, pan] of [[-0.11, -0.7], [0, 0], [0.12, 0.7]]) {
        const f = midiHz(m + det)
        const lp = new Biquad('lp', cutoff, 0.7)
        let ph = rand()
        mix.voice(t, dur + 0.8, (i, s) => {
          ph = (ph + f / SR) % 1
          const saw = 2 * ph - 1 - polyblep(ph, f / SR)
          const env = Math.min(1, s / 0.35) * (s > dur ? Math.exp(-(s - dur) / 0.3) : 1)
          return lp.run(saw) * env
        }, { gain: 0.045 * g, pan: pan * (n % 2 ? -1 : 1), rev: 0.5, duck: 0.75 })
      }
    })
  },
}

/** One-shot sound design, triggered by composition cues. */
const fx = {
  tap(mix, t, { gain = 1 } = {}) {
    let ph = 0
    mix.voice(t, 0.06, (i, s) => {
      ph += (2 * Math.PI * (1900 - 900 * (s / 0.06))) / SR
      return (Math.sin(ph) * Math.exp(-s / 0.012) + noise() * Math.exp(-s / 0.0012) * 0.4) * 0.5
    }, { gain: 0.5 * gain, rev: 0.1 })
  },
  tick(mix, t, { gain = 1 } = {}) {
    const hp = new Biquad('hp', 3000)
    mix.voice(t, 0.03, (i, s) => hp.run(noise()) * Math.exp(-s / 0.004), { gain: 0.25 * gain })
  },
  pop(mix, t, { gain = 1 } = {}) {
    let ph = 0
    mix.voice(t, 0.12, (i, s) => {
      ph += (2 * Math.PI * (520 + 900 * Math.min(1, s / 0.05))) / SR
      return Math.sin(ph) * Math.exp(-s / 0.035)
    }, { gain: 0.35 * gain, rev: 0.2 })
  },
  whoosh(mix, t, { gain = 1, dur = 0.5 } = {}) {
    const bp = new Biquad('bp', 800, 1.4)
    mix.voice(t, dur, (i, s) => {
      const p = s / dur
      if (i % 32 === 0) bp.set(500 + 5000 * Math.sin(Math.PI * Math.min(1, p * 1.1)))
      return bp.run(noise()) * Math.pow(Math.sin(Math.PI * p), 2) * 1.8
    }, { gain: 0.5 * gain, pan: 0, rev: 0.25 })
  },
  hit(mix, t, { gain = 1 } = {}) {
    let ph = 0
    const bp = new Biquad('bp', 2200, 0.8)
    mix.voice(t, 0.9, (i, s) => {
      ph += (2 * Math.PI * (48 + 90 * Math.exp(-s / 0.04))) / SR
      const boom = Math.sin(ph) * Math.exp(-s / 0.35)
      const snap = bp.run(noise()) * Math.exp(-s / 0.05) * 0.9
      return Math.tanh((boom + snap) * 1.6)
    }, { gain: 0.75 * gain, rev: 0.3 })
    mix.addDuck(t, 0.8, 0.25)
  },
  plate(mix, t, { gain = 1 } = {}) {
    // Iron plates clanking onto a bar: inharmonic partials + a noise transient.
    const partials = [[310, 1], [856, 0.6], [1674, 0.35], [2768, 0.22]]
    const hp = new Biquad('hp', 1800)
    let phs = partials.map(() => 0)
    mix.voice(t, 0.7, (i, s) => {
      let v = 0
      partials.forEach(([f, a], n) => {
        phs[n] += (2 * Math.PI * f) / SR
        v += Math.sin(phs[n]) * a * Math.exp(-s / (0.22 / (n + 1)))
      })
      return v * 0.5 + hp.run(noise()) * Math.exp(-s / 0.01) * 0.6
    }, { gain: 0.5 * gain, rev: 0.35 })
    fx.hit(mix, t, { gain: 0.6 * gain })
  },
  impact(mix, t, { gain = 1 } = {}) {
    let ph = 0
    const hp = new Biquad('hp', 2500)
    mix.voice(t, 2.4, (i, s) => {
      ph += (2 * Math.PI * (32 + 60 * Math.exp(-s / 0.08))) / SR
      return Math.sin(ph) * Math.exp(-s / 0.9) * 0.9 + hp.run(noise()) * Math.exp(-s / 0.6) * 0.3
    }, { gain: 0.8 * gain, rev: 0.45 })
    mix.addDuck(t, 0.9, 0.4)
  },
  riser(mix, t, { gain = 1, dur = 2 } = {}) {
    const bp = new Biquad('bp', 300, 2)
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      const p = s / dur
      if (i % 32 === 0) bp.set(300 + 7000 * p * p)
      ph += (2 * Math.PI * (200 + 900 * p * p)) / SR
      return (bp.run(noise()) * 1.4 + Math.sin(ph) * 0.15) * p * p
    }, { gain: 0.45 * gain, rev: 0.4 })
  },
  confirm(mix, t, { gain = 1 } = {}) {
    // Two-note "set done" chime (E6 → A6).
    for (const [o, m] of [[0, 88], [0.07, 93]]) {
      let ph = 0
      mix.voice(t + o, 0.35, (i, s) => {
        ph += (2 * Math.PI * midiHz(m)) / SR
        return Math.sin(ph) * Math.exp(-s / 0.09)
      }, { gain: 0.16 * gain, rev: 0.3, dly: 0.15 })
    }
  },
}

/* ---------- arranger ---------- */

// Am – F – C – G, as [bass root, pad voicing]
const CHORDS = [
  [45, [57, 60, 64]],
  [41, [57, 60, 65]],
  [48, [55, 60, 64]],
  [43, [55, 59, 62]],
]
const ARP = [0, 1, 2, 1, 2, 0, 1, 2]

/**
 * Voices that duck the mix (kicks, hits) must run before everything they
 * duck, so events are queued as [pass, run] and executed in two passes.
 */
const DUCKERS = new Set(['kick', 'hit', 'impact', 'plate'])
const queueing = (lib, queue) =>
  new Proxy(lib, {
    get: (target, name) => (...args) => queue.push([DUCKERS.has(name) ? 0 : 1, () => target[name](...args)]),
  })
const queuedInst = (queue) => queueing(inst, queue)
const queuedFx = (queue) => queueing(fx, queue)

function arrange(mix, sections, beat, queue) {
  const inst = queuedInst(queue)
  const fx = queuedFx(queue)
  const bar = beat * 4
  for (const sec of sections) {
    for (let b = 0; b < sec.bars; b++) {
      const t0 = sec.at + b * bar
      const globalBar = Math.round(t0 / bar)
      const [root, voicing] = CHORDS[((globalBar % 4) + 4) % 4]
      const part = sec.part
      const last = b === sec.bars - 1
      const progress = sec.bars > 1 ? b / (sec.bars - 1) : 1

      if (['intro', 'build', 'drop', 'break', 'drive'].includes(part)) {
        if (part !== 'drive') inst.pad(mix, t0, bar, voicing, { g: part === 'drop' ? 0.9 : 1, cutoff: part === 'intro' ? 1100 : 2000 })
        // 16th-note pluck arpeggio; the filter opens as a build progresses.
        const cutoff = part === 'intro' ? 1400 : part === 'build' ? 1400 + 3500 * progress : 4200
        const steps = part === 'intro' ? 8 : 16
        for (let s = 0; s < steps; s++) {
          const note = voicing[ARP[s % ARP.length]] + 12 * (s % 8 >= 4 ? 1 : 0)
          inst.pluck(mix, t0 + s * (bar / steps), note, { cutoff, pan: s % 2 ? 0.35 : -0.35, g: part === 'drive' ? 0.6 : 1 })
        }
      }
      if (part === 'drop' || part === 'drive') {
        for (let q = 0; q < 4; q++) inst.kick(mix, t0 + q * beat)
        inst.clap(mix, t0 + beat)
        inst.clap(mix, t0 + beat * 3)
        for (let e = 0; e < 8; e++) inst.hat(mix, t0 + e * (beat / 2), { open: e % 2 === 1, g: e % 2 ? 1 : 0.7 })
        for (let e = 0; e < 8; e++) inst.bass(mix, t0 + e * (beat / 2) + beat / 4, beat / 4.5, root + (e === 7 ? 12 : 0))
      }
      if (part === 'build') {
        // Kick on every beat, then a snare roll that doubles into the drop.
        for (let q = 0; q < 4; q++) inst.kick(mix, t0 + q * beat, 0.6 + 0.4 * progress)
        if (last) for (let s = 0; s < 8; s++) inst.clap(mix, t0 + beat * 2 + s * (beat / 4), 0.4 + s * 0.08)
        for (let e = 0; e < 8; e++) inst.hat(mix, t0 + e * (beat / 2) + beat / 4, { g: 0.5 + progress * 0.5 })
      }
      if (part === 'intro') for (let e = 0; e < 4; e++) inst.hat(mix, t0 + e * beat + beat / 2, { g: 0.6 })
      if (part === 'outro' && b === 0) {
        inst.pad(mix, t0, bar * sec.bars, CHORDS[0][1], { g: 1.2, cutoff: 1400 })
        inst.bass(mix, t0, bar * 0.9, 33, 1.2)
        inst.kick(mix, t0)
        fx.impact(mix, t0)
      }
    }
  }
}

/**
 * Renders a composition's audio cues to a 48 kHz stereo 16-bit WAV.
 * `music: false` renders the sound design alone (for platforms where the
 * creator swaps in a trending track).
 */
export function renderAudio(audio, duration, outPath, { music = true } = {}) {
  const beat = 60 / audio.bpm
  const mix = new Mix(duration)
  const queue = []
  if (music) arrange(mix, audio.sections, beat, queue)
  for (const cue of audio.sfx) {
    if (!fx[cue.type]) throw new Error(`unknown sfx ${cue.type}`)
    queue.push([DUCKERS.has(cue.type) ? 0 : 1, () => fx[cue.type](mix, cue.t, cue)])
  }
  // Duckers first, so the sidechain envelope exists before what it ducks is mixed.
  for (const pass of [0, 1]) for (const [prio, run] of queue) if (prio === pass) run()
  mix.finish({ beat })
  writeWav(outPath, mix.L, mix.R)
}

function writeWav(path, L, R) {
  const n = L.length
  const buf = Buffer.alloc(44 + n * 4)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 4, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 4, 28)
  buf.writeUInt16LE(4, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 4, 40)
  for (let k = 0; k < n; k++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[k])) * 32767), 44 + k * 4)
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[k])) * 32767), 46 + k * 4)
  }
  writeFileSync(path, buf)
}
