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
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { VIDEOS_DIR } from './paths.mjs'

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


/* ---------- styles beyond the launch-video EDM (animated reels) ---------- */
//
// Research (listing/research/09-animation-viral-and-sound.md): each animated
// video needs its own sound world. Parts added to `arrange` below:
//   phonk, phonk-lite   150 BPM Brazilian-phonk: 808, cowbell tresillo, bells
//   cartoon             120 BPM pizzicato + woodblock + glock (comedy)
//   uke                 100 BPM ukulele strum + whistle tune (jaunty list song)
//   lofi                 90 BPM Rhodes + soft drums + vinyl
//   chip, chip-lite     150 BPM square arps + triangle bass (8-bit)
//   pop                 120 BPM major, bouncy marimba stabs
//   synth               120 BPM saw bass + square arps (glitch / code)
//   ambient              75 BPM pads, drone, heartbeat
//   doodle              100 BPM upright pizz + marimba + brushes
// One-shot effects: see `fx` (boing, slidewhistle, cowbell, clank, paper,
// pencil, bubble, coin, glitch, stinger, blip, jump, laser, powerup, hurt, ko,
// thud, clack, zip, ding, fail, stamp, keyclick, note ...).

const SEMI = (m) => Math.pow(2, m / 12)

Object.assign(inst, {
  kick808(mix, t, g = 1, { len = 0.55 } = {}) {
    let ph = 0
    mix.voice(t, len + 0.1, (i, s) => {
      const f = 38 + 95 * Math.exp(-s / 0.045)
      ph += (2 * Math.PI * f) / SR
      const body = Math.sin(ph) * Math.exp(-s / (len * 0.55))
      return Math.tanh(body * 2.2 + noise() * Math.exp(-s / 0.002) * 0.3) * 0.95
    }, { gain: g })
    mix.addDuck(t, 0.8, 0.2)
  },
  sub808(mix, t, dur, midi, g = 1, { slideTo = null } = {}) {
    let ph = 0
    mix.voice(t, dur + 0.08, (i, s) => {
      const f0 = midiHz(midi)
      const f = slideTo ? f0 * Math.pow(midiHz(slideTo) / f0, Math.min(1, Math.max(0, (s - dur * 0.6) / (dur * 0.4)))) : f0
      ph += (2 * Math.PI * f) / SR
      const env = Math.min(1, s / 0.004) * (s > dur ? Math.exp(-(s - dur) / 0.03) : 1)
      return Math.tanh(Math.sin(ph) * 2.4) * env
    }, { gain: 0.36 * g, duck: 0.9 })
  },
  snare(mix, t, g = 1) {
    const bp = new Biquad('bp', 2100, 0.8)
    let ph = 0
    mix.voice(t, 0.3, (i, s) => {
      ph += (2 * Math.PI * (200 - 60 * Math.min(1, s / 0.1))) / SR
      return bp.run(noise()) * Math.exp(-s / 0.09) * 1.3 + Math.sin(ph) * Math.exp(-s / 0.05) * 0.5
    }, { gain: 0.5 * g, rev: 0.2 })
  },
  brush(mix, t, g = 1) {
    const bp = new Biquad('bp', 4200, 0.6)
    mix.voice(t, 0.25, (i, s) => bp.run(noise()) * (Math.min(1, s / 0.04)) * Math.exp(-s / 0.1), { gain: 0.3 * g, rev: 0.1 })
  },
  cowbell(mix, t, g = 1, pan = 0.1) {
    const bp = new Biquad('bp', 760, 1.2)
    let p1 = 0
    let p2 = 0
    mix.voice(t, 0.25, (i, s) => {
      p1 = (p1 + 587 / SR) % 1
      p2 = (p2 + 845 / SR) % 1
      const sq = (p1 < 0.5 ? 1 : -1) + (p2 < 0.5 ? 1 : -1)
      return bp.run(sq) * Math.exp(-s / 0.07) * 1.6
    }, { gain: 0.3 * g, pan, rev: 0.12 })
  },
  bell(mix, t, midi, { g = 1, pan = 0, dur = 0.9, dly = 0.3 } = {}) {
    const f = midiHz(midi)
    let pc = 0
    let pm = 0
    mix.voice(t, dur, (i, s) => {
      pm += (2 * Math.PI * f * 3.5) / SR
      pc += (2 * Math.PI * f) / SR
      const idx = 2.4 * Math.exp(-s / 0.12)
      return Math.sin(pc + Math.sin(pm) * idx) * Math.exp(-s / (dur * 0.35)) * Math.min(1, s / 0.002)
    }, { gain: 0.16 * g, pan, rev: 0.4, dly, duck: 0.3 })
  },
  marimba(mix, t, midi, { g = 1, pan = 0, dur = 0.5, rev = 0.18 } = {}) {
    const f = midiHz(midi)
    let a = 0
    let b = 0
    let c = 0
    mix.voice(t, dur, (i, s) => {
      a += (2 * Math.PI * f) / SR
      b += (2 * Math.PI * f * 4) / SR
      c += (2 * Math.PI * f * 9.2) / SR
      const body = Math.sin(a) * Math.exp(-s / (dur * 0.5)) + Math.sin(b) * 0.28 * Math.exp(-s / 0.07) + Math.sin(c) * 0.08 * Math.exp(-s / 0.025)
      return (body + noise() * Math.exp(-s / 0.002) * 0.15) * Math.min(1, s / 0.0015)
    }, { gain: 0.34 * g, pan, rev, dly: 0.12 })
  },
  uke(mix, t, midi, { g = 1, pan = 0, decay = 0.992 } = {}) {
    const f = midiHz(midi)
    const N = Math.max(2, Math.round(SR / f))
    const buf = new Float32Array(N)
    for (let k = 0; k < N; k++) buf[k] = noise()
    let idx = 0
    mix.voice(t, 0.7, (i, s) => {
      const y = buf[idx]
      buf[idx] = 0.5 * (y + buf[(idx + 1) % N]) * decay
      idx = (idx + 1) % N
      return y * Math.min(1, s / 0.001)
    }, { gain: 0.28 * g, pan, rev: 0.2 })
  },
  strum(mix, t, midis, { g = 1, up = false, pan = 0, gap = 0.014 } = {}) {
    const list = up ? [...midis].reverse() : midis
    list.forEach((m, n) => inst.uke(mix, t + n * gap, m, { g: g * (up ? 0.7 : 1), pan }))
  },
  whistle(mix, t, dur, midi, { g = 1, vib = 5.5, pan = 0 } = {}) {
    const f = midiHz(midi)
    const hp = new Biquad('bp', f * 2, 3)
    let ph = 0
    mix.voice(t, dur + 0.06, (i, s) => {
      const vibr = 1 + 0.008 * Math.sin(2 * Math.PI * vib * s) * Math.min(1, s / 0.25)
      ph += (2 * Math.PI * f * vibr) / SR
      const env = Math.min(1, s / 0.03) * (s > dur ? Math.exp(-(s - dur) / 0.03) : 1)
      return (Math.sin(ph) + Math.sin(ph * 2) * 0.06 + hp.run(noise()) * 0.05) * env
    }, { gain: 0.22 * g, pan, rev: 0.3, dly: 0.2 })
  },
  square(mix, t, dur, midi, { g = 1, duty = 0.5, slideTo = null, pan = 0, decay = 0 } = {}) {
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      const f0 = midiHz(midi)
      const f = slideTo ? f0 * Math.pow(midiHz(slideTo) / f0, Math.min(1, s / dur)) : f0
      ph = (ph + f / SR) % 1
      const env = Math.min(1, s / 0.002) * (decay ? Math.exp(-s / decay) : s > dur - 0.01 ? (dur - s) / 0.01 : 1)
      return (ph < duty ? 1 : -1) * env
    }, { gain: 0.1 * g, pan })
  },
  tri(mix, t, dur, midi, g = 1) {
    let ph = 0
    const f = midiHz(midi)
    mix.voice(t, dur, (i, s) => {
      ph = (ph + f / SR) % 1
      const env = Math.min(1, s / 0.003) * (s > dur - 0.02 ? Math.max(0, (dur - s) / 0.02) : 1)
      return (Math.abs(ph * 4 - 2) - 1) * env
    }, { gain: 0.3 * g, duck: 0.6 })
  },
  chipHat(mix, t, g = 1, long = false) {
    const hp = new Biquad('hp', 6000)
    mix.voice(t, long ? 0.12 : 0.04, (i, s) => hp.run(noise()) * Math.exp(-s / (long ? 0.04 : 0.01)), { gain: 0.12 * g, pan: 0.2 })
  },
  chipSnare(mix, t, g = 1) {
    const bp = new Biquad('bp', 3000, 0.7)
    mix.voice(t, 0.16, (i, s) => bp.run(noise()) * Math.exp(-s / 0.05) * 1.4, { gain: 0.3 * g })
  },
  chipKick(mix, t, g = 1) {
    let ph = 0
    mix.voice(t, 0.18, (i, s) => {
      ph += (2 * Math.PI * (40 + 160 * Math.exp(-s / 0.025))) / SR
      return (Math.sin(ph) > 0 ? 1 : -1) * Math.exp(-s / 0.07)
    }, { gain: 0.3 * g })
    mix.addDuck(t, 0.5, 0.1)
  },
  rhodes(mix, t, dur, midis, { g = 1, pan = 0 } = {}) {
    midis.forEach((m, n) => {
      const f = midiHz(m)
      let pc = 0
      let pm = 0
      mix.voice(t + n * 0.012, dur, (i, s) => {
        pm += (2 * Math.PI * f * 1) / SR
        pc += (2 * Math.PI * f) / SR
        const idx = 0.9 * Math.exp(-s / 0.4)
        const env = Math.min(1, s / 0.004) * (s > dur - 0.2 ? Math.max(0, (dur - s) / 0.2) : 1) * (0.55 + 0.45 * Math.exp(-s / 0.9))
        return Math.sin(pc + Math.sin(pm) * idx) * env
      }, { gain: 0.07 * g, pan: pan + (n - 1.5) * 0.15, rev: 0.35, duck: 0.35 })
    })
  },
  vinyl(mix, t, dur, g = 1) {
    const lp = new Biquad('lp', 5000)
    mix.voice(t, dur, () => {
      const pop = rand() < 0.0009 ? noise() * 0.9 : 0
      return lp.run(noise() * 0.02) + pop * 0.5
    }, { gain: 0.5 * g })
  },
  shaker(mix, t, g = 1, pan = -0.2) {
    const hp = new Biquad('hp', 6500)
    mix.voice(t, 0.07, (i, s) => hp.run(noise()) * Math.min(1, s / 0.01) * Math.exp(-s / 0.025), { gain: 0.14 * g, pan })
  },
  pizz(mix, t, midi, g = 1) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', 900)
    let ph = 0
    mix.voice(t, 0.3, (i, s) => {
      ph = (ph + f / SR) % 1
      return lp.run(Math.abs(ph * 4 - 2) - 1 + Math.sin(2 * Math.PI * ph) * 0.4) * Math.exp(-s / 0.11) * Math.min(1, s / 0.002)
    }, { gain: 0.5 * g, duck: 0.5 })
  },
  woodblock(mix, t, g = 1) {
    let ph = 0
    mix.voice(t, 0.1, (i, s) => {
      ph += (2 * Math.PI * 1700) / SR
      return Math.sin(ph) * Math.exp(-s / 0.02) + noise() * Math.exp(-s / 0.002) * 0.3
    }, { gain: 0.3 * g, rev: 0.1 })
  },
  drone(mix, t, dur, midi, g = 1) {
    const f = midiHz(midi)
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      ph += (2 * Math.PI * f) / SR
      const env = Math.min(1, s / 1.2) * (s > dur - 1 ? Math.max(0, dur - s) : 1)
      return (Math.sin(ph) + Math.sin(ph * 2.003) * 0.3) * env
    }, { gain: 0.3 * g, rev: 0.3 })
  },
  heart(mix, t, g = 1) {
    for (const [o, a] of [[0, 1], [0.22, 0.7]]) {
      let ph = 0
      mix.voice(t + o, 0.25, (i, s) => {
        ph += (2 * Math.PI * (52 + 40 * Math.exp(-s / 0.03))) / SR
        return Math.sin(ph) * Math.exp(-s / 0.07)
      }, { gain: 0.6 * g * a })
    }
  },
})

function note(mix, t, { inst: name = 'marimba', midi = 72, dur = 0.4, gain = 1, pan = 0 } = {}) {
  if (name === 'marimba') inst.marimba(mix, t, midi, { g: gain, pan, dur: Math.max(0.3, dur) })
  else if (name === 'bell') inst.bell(mix, t, midi, { g: gain, pan, dur: Math.max(0.6, dur) })
  else if (name === 'uke') inst.uke(mix, t, midi, { g: gain, pan })
  else if (name === 'whistle') inst.whistle(mix, t, dur, midi, { g: gain, pan })
  else if (name === 'square') inst.square(mix, t, dur, midi, { g: gain * 1.5, duty: 0.25, pan })
  else if (name === 'pluck') inst.pluck(mix, t, midi, { g: gain, pan })
  else throw new Error(`unknown note instrument ${name}`)
}

Object.assign(fx, {
  note,
  cowbell: (mix, t, { gain = 1 } = {}) => inst.cowbell(mix, t, gain),
  clank(mix, t, { gain = 1 } = {}) {
    // A single iron plate laid on a bar: inharmonic ring, no boom.
    const partials = [[420, 1], [1130, 0.55], [2210, 0.32], [3480, 0.18]]
    const hp = new Biquad('hp', 2200)
    const phs = partials.map(() => 0)
    mix.voice(t, 0.8, (i, s) => {
      let v = 0
      partials.forEach(([f, a], n) => {
        phs[n] += (2 * Math.PI * f) / SR
        v += Math.sin(phs[n]) * a * Math.exp(-s / (0.3 / (n + 1)))
      })
      return v * 0.5 + hp.run(noise()) * Math.exp(-s / 0.006) * 0.5
    }, { gain: 0.42 * gain, rev: 0.3, pan: (rand() - 0.5) * 0.3 })
  },
  clack(mix, t, { gain = 1 } = {}) {
    // Two hard things meeting: a short, dry, woody click.
    const bp = new Biquad('bp', 1500, 1.4)
    let ph = 0
    mix.voice(t, 0.08, (i, s) => {
      ph += (2 * Math.PI * 900) / SR
      return bp.run(noise()) * Math.exp(-s / 0.006) * 1.2 + Math.sin(ph) * Math.exp(-s / 0.012) * 0.6
    }, { gain: 0.5 * gain, rev: 0.12 })
  },
  thud(mix, t, { gain = 1 } = {}) {
    let ph = 0
    const lp = new Biquad('lp', 400)
    mix.voice(t, 0.4, (i, s) => {
      ph += (2 * Math.PI * (70 + 40 * Math.exp(-s / 0.03))) / SR
      return Math.sin(ph) * Math.exp(-s / 0.09) + lp.run(noise()) * Math.exp(-s / 0.02) * 0.5
    }, { gain: 0.7 * gain, rev: 0.15 })
    mix.addDuck(t, 0.5, 0.15)
  },
  boing(mix, t, { gain = 1, dur = 0.45 } = {}) {
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      const wob = 1 + 0.35 * Math.sin(2 * Math.PI * 11 * s) * Math.exp(-s / 0.25)
      ph += (2 * Math.PI * (180 + 260 * Math.exp(-s / 0.18)) * wob) / SR
      return (Math.sin(ph) + Math.sin(ph * 2) * 0.3) * Math.exp(-s / (dur * 0.5)) * Math.min(1, s / 0.004)
    }, { gain: 0.38 * gain, rev: 0.12 })
  },
  slidewhistle(mix, t, { gain = 1, dur = 0.6, from = 72, to = 96 } = {}) {
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      const p = s / dur
      ph += (2 * Math.PI * midiHz(from + (to - from) * p * p)) / SR
      return Math.sin(ph) * Math.sin(Math.PI * Math.min(1, p)) ** 0.5 * 0.9
    }, { gain: 0.24 * gain, rev: 0.25 })
  },
  fail(mix, t, { gain = 1 } = {}) {
    // Sad trombone: four sagging notes.
    const seq = [[0, 58, 0.28], [0.3, 57, 0.28], [0.6, 56, 0.28], [0.9, 55, 0.7]]
    seq.forEach(([o, m, d], n) => {
      let ph = 0
      const lp = new Biquad('lp', 900, 0.8)
      mix.voice(t + o, d + 0.08, (i, s) => {
        const f = midiHz(m) * (n === 3 ? 1 - 0.07 * Math.min(1, Math.max(0, (s - 0.25) / 0.4)) : 1) * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * s))
        ph = (ph + f / SR) % 1
        const env = Math.min(1, s / 0.03) * (s > d ? Math.exp(-(s - d) / 0.05) : 1)
        return lp.run(2 * ph - 1) * env
      }, { gain: 0.3 * gain, rev: 0.2 })
    })
  },
  paper(mix, t, { gain = 1, dur = 0.35 } = {}) {
    const bp = new Biquad('bp', 3200, 0.5)
    mix.voice(t, dur, (i, s) => {
      const crackle = rand() < 0.25 ? noise() : noise() * 0.25
      return bp.run(crackle) * Math.min(1, s / 0.01) * Math.exp(-s / (dur * 0.5))
    }, { gain: 0.5 * gain, rev: 0.08 })
  },
  pencil(mix, t, { gain = 1, dur = 0.4 } = {}) {
    const bp = new Biquad('bp', 5200, 1.1)
    mix.voice(t, dur, (i, s) => {
      const strokes = 0.5 + 0.5 * Math.sin(2 * Math.PI * 17 * s)
      return bp.run(noise()) * strokes * Math.min(1, s / 0.02) * Math.min(1, (dur - s) / 0.03)
    }, { gain: 0.3 * gain, pan: 0.1 })
  },
  bubble(mix, t, { gain = 1 } = {}) {
    let ph = 0
    mix.voice(t, 0.15, (i, s) => {
      ph += (2 * Math.PI * (380 + 1500 * Math.min(1, s / 0.06))) / SR
      return Math.sin(ph) * Math.exp(-s / 0.04) * Math.min(1, s / 0.003)
    }, { gain: 0.35 * gain, rev: 0.25 })
  },
  coin(mix, t, { gain = 1 } = {}) {
    for (const [o, m] of [[0, 83], [0.07, 88]]) inst.square(mix, t + o, o ? 0.28 : 0.07, m, { g: 2.4 * gain, duty: 0.5, decay: o ? 0.16 : 0 })
  },
  blip(mix, t, { gain = 1, midi = 84 } = {}) {
    inst.square(mix, t, 0.05, midi, { g: 2.6 * gain, duty: 0.25 })
  },
  jump(mix, t, { gain = 1 } = {}) {
    inst.square(mix, t, 0.22, 64, { g: 2.6 * gain, duty: 0.25, slideTo: 88 })
  },
  laser(mix, t, { gain = 1 } = {}) {
    inst.square(mix, t, 0.2, 100, { g: 2.6 * gain, duty: 0.125, slideTo: 60 })
  },
  powerup(mix, t, { gain = 1 } = {}) {
    ;[72, 76, 79, 84, 88, 91, 96].forEach((m, n) => inst.square(mix, t + n * 0.055, 0.07, m, { g: 2.4 * gain, duty: 0.25 }))
  },
  hurt(mix, t, { gain = 1 } = {}) {
    inst.square(mix, t, 0.3, 70, { g: 2.6 * gain, duty: 0.5, slideTo: 40 })
  },
  ko(mix, t, { gain = 1 } = {}) {
    ;[67, 64, 60, 55, 48].forEach((m, n) => inst.square(mix, t + n * 0.12, 0.14, m, { g: 2.4 * gain, duty: 0.5 }))
    fx.hit(mix, t + 0.1, { gain: 0.6 * gain })
  },
  glitch(mix, t, { gain = 1, dur = 0.25 } = {}) {
    const hp = new Biquad('hp', 1200)
    mix.voice(t, dur, (i, s) => {
      const gate = Math.floor(s * 60) % 3 === 0 ? 0 : 1
      const f = 200 + 600 * ((Math.floor(s * 40) * 7919) % 13) / 13
      return (hp.run(noise()) * 0.5 + Math.sign(Math.sin(2 * Math.PI * f * s)) * 0.4) * gate * Math.min(1, (dur - s) / 0.02)
    }, { gain: 0.3 * gain, pan: (rand() - 0.5) * 0.6 })
  },
  zip(mix, t, { gain = 1, dur = 0.18 } = {}) {
    const bp = new Biquad('bp', 1000, 2)
    mix.voice(t, dur, (i, s) => {
      if (i % 32 === 0) bp.set(600 + 6000 * (s / dur))
      return bp.run(noise()) * Math.sin((Math.PI * s) / dur) * 1.6
    }, { gain: 0.35 * gain })
  },
  ding(mix, t, { gain = 1, midi = 91 } = {}) {
    inst.bell(mix, t, midi, { g: 1.4 * gain, dur: 0.9 })
  },
  stamp(mix, t, { gain = 1 } = {}) {
    fx.thud(mix, t, { gain: 0.9 * gain })
    fx.clack(mix, t, { gain: 0.6 * gain })
  },
  keyclick(mix, t, { gain = 1 } = {}) {
    const bp = new Biquad('bp', 2600, 1.5)
    mix.voice(t, 0.04, (i, s) => bp.run(noise()) * Math.exp(-s / 0.005) * 1.4, { gain: 0.3 * gain, pan: (rand() - 0.5) * 0.4 })
  },
  heartbeat: (mix, t, { gain = 1 } = {}) => inst.heart(mix, t, gain),
  /* ---------- comedy kit (batch C, research 11) ---------- */
  /**
   * Gibberish speech ("animalese"): a run of short voiced syllables through
   * two random vowel formants. `pitch` is the speaker's base MIDI note,
   * `dur` the length of the line. Language-free, so ES and EN share a take.
   */
  blab(mix, t, { gain = 1, dur = 0.6, pitch = 62, seed = 1, rise = 0 } = {}) {
    const r = mulberry32(Math.round(seed * 9973 + pitch * 31))
    const VOW = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [570, 840]]
    const syl = 0.085
    const n = Math.max(1, Math.round(dur / syl))
    for (let k = 0; k < n; k++) {
      const [f1, f2] = VOW[Math.floor(r() * VOW.length)]
      const m = pitch + (r() - 0.5) * 5 + (rise * k) / n
      const f = midiHz(m)
      const b1 = new Biquad('bp', f1, 5)
      const b2 = new Biquad('bp', f2, 7)
      let ph = 0
      mix.voice(t + k * syl, syl * 0.82, (i, s) => {
        ph = (ph + (f * (1 + 0.03 * Math.sin(2 * Math.PI * 30 * s))) / SR) % 1
        const src = (ph < 0.3 ? 1 : -1) + (2 * ph - 1) * 0.5
        const env = Math.min(1, s / 0.006) * Math.min(1, (syl * 0.82 - s) / 0.012)
        return (b1.run(src) * 1.4 + b2.run(src) * 0.8) * env
      }, { gain: 0.55 * gain, rev: 0.06 })
    }
  },
  /** A long, wobbling gibberish scream. */
  scream(mix, t, { gain = 1, dur = 0.8, pitch = 74 } = {}) {
    const b1 = new Biquad('bp', 850, 4)
    const b2 = new Biquad('bp', 1400, 5)
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      const f = midiHz(pitch + 5 * Math.min(1, s / 0.15)) * (1 + 0.035 * Math.sin(2 * Math.PI * 9 * s))
      ph = (ph + f / SR) % 1
      const src = (ph < 0.3 ? 1 : -1) + (2 * ph - 1) * 0.6
      return (b1.run(src) * 1.4 + b2.run(src)) * Math.min(1, s / 0.02) * Math.min(1, (dur - s) / 0.08)
    }, { gain: 0.5 * gain, rev: 0.2 })
  },
  /** The meme boom: a deep, roomy thump for a realisation or a hard cut. */
  boom(mix, t, { gain = 1 } = {}) {
    let ph = 0
    mix.voice(t, 1.6, (i, s) => {
      ph += (2 * Math.PI * (36 + 70 * Math.exp(-s / 0.05))) / SR
      return Math.tanh(Math.sin(ph) * 2.6) * Math.exp(-s / 0.55) + noise() * Math.exp(-s / 0.004) * 0.4
    }, { gain: 0.85 * gain, rev: 0.6 })
    mix.addDuck(t, 0.9, 0.5)
  },
  /** Record scratch: the joke just turned. */
  scratch(mix, t, { gain = 1 } = {}) {
    const bp = new Biquad('bp', 1500, 1.6)
    let ph = 0
    mix.voice(t, 0.42, (i, s) => {
      const p = s / 0.42
      const sweep = p < 0.35 ? p / 0.35 : p < 0.6 ? 1 - (p - 0.35) / 0.25 : (p - 0.6) / 0.4
      if (i % 16 === 0) bp.set(500 + 3800 * sweep)
      ph += (2 * Math.PI * (120 + 900 * sweep)) / SR
      return (bp.run(noise()) * 1.6 + Math.sin(ph) * 0.35) * Math.min(1, s / 0.004) * Math.min(1, (0.42 - s) / 0.03)
    }, { gain: 0.6 * gain })
  },
  /** Crickets: the silence after a bad idea. */
  crickets(mix, t, { gain = 1, dur = 1.4 } = {}) {
    mix.voice(t, dur, (i, s) => {
      const chirp = s % 0.42
      const on = chirp < 0.16 ? Math.sin(2 * Math.PI * 34 * chirp) > 0.2 ? 1 : 0 : 0
      return Math.sin(2 * Math.PI * 4300 * s) * on * 0.6 * Math.min(1, s / 0.05) * Math.min(1, (dur - s) / 0.1)
    }, { gain: 0.16 * gain, pan: 0.3, rev: 0.25 })
  },
  /** A heavenly "aah" chord: something is too good to be true. */
  choir(mix, t, { gain = 1, dur = 1.8, root = 60 } = {}) {
    for (const [m, pan] of [[0, -0.5], [4, 0], [7, 0.5], [12, 0.2]]) {
      const f = midiHz(root + m)
      const b1 = new Biquad('bp', 800, 3)
      const b2 = new Biquad('bp', 1150, 4)
      let ph = rand()
      mix.voice(t, dur, (i, s) => {
        ph = (ph + (f * (1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * s + m))) / SR) % 1
        const src = 2 * ph - 1
        return (b1.run(src) + b2.run(src) * 0.7) * Math.min(1, s / 0.25) * Math.min(1, (dur - s) / 0.3)
      }, { gain: 0.2 * gain, pan, rev: 0.7 })
    }
  },
  /** Dun-dun-DUN: three low brassy notes. */
  dundun(mix, t, { gain = 1 } = {}) {
    ;[[0, 43, 0.22], [0.26, 43, 0.22], [0.52, 39, 0.9]].forEach(([o, m, d], n) => {
      for (const oct of [0, 12]) {
        const lp = new Biquad('lp', 1100, 0.9)
        let ph = 0
        const f = midiHz(m + oct)
        mix.voice(t + o, d + 0.1, (i, s) => {
          ph = (ph + f / SR) % 1
          const env = Math.min(1, s / 0.015) * (s > d ? Math.exp(-(s - d) / 0.06) : 1)
          return lp.run(2 * ph - 1) * env
        }, { gain: (n === 2 ? 0.36 : 0.28) * gain, rev: 0.35 })
      }
    })
    fx.thud(mix, t + 0.52, { gain: 0.8 * gain })
  },
  /** A rubber squeak (sore legs, a tiny step). */
  squeak(mix, t, { gain = 1, pitch = 84, down = false } = {}) {
    let ph = 0
    mix.voice(t, 0.13, (i, s) => {
      const p = s / 0.13
      const f = midiHz(pitch) * (down ? 1.5 - 0.6 * p : 0.8 + 0.7 * p)
      ph += (2 * Math.PI * f) / SR
      return (Math.sin(ph) + Math.sin(ph * 2) * 0.4) * Math.sin(Math.PI * p)
    }, { gain: 0.3 * gain, rev: 0.08 })
  },
  /** Bonk: a hollow knock on the head. */
  bonk(mix, t, { gain = 1, pitch = 60 } = {}) {
    let ph = 0
    mix.voice(t, 0.22, (i, s) => {
      ph += (2 * Math.PI * midiHz(pitch) * (1 + 0.5 * Math.exp(-s / 0.012))) / SR
      return Math.sin(ph) * Math.exp(-s / 0.05) + noise() * Math.exp(-s / 0.002) * 0.5
    }, { gain: 0.55 * gain, rev: 0.15 })
  },
  /** Ta-da: a tiny triumphant fanfare. */
  tada(mix, t, { gain = 1 } = {}) {
    ;[[0, [60, 64, 67], 0.14], [0.16, [65, 69, 72], 0.14], [0.32, [67, 72, 76, 79], 0.7]].forEach(([o, ch, d]) => {
      for (const m of ch) {
        const lp = new Biquad('lp', 2600, 0.8)
        let ph = 0
        const f = midiHz(m)
        mix.voice(t + o, d + 0.1, (i, s) => {
          ph = (ph + f / SR) % 1
          const env = Math.min(1, s / 0.01) * (s > d ? Math.exp(-(s - d) / 0.08) : 1)
          return lp.run(2 * ph - 1) * env
        }, { gain: 0.13 * gain, rev: 0.3 })
      }
    })
  },
  /** A sad four-note power-down (original): something gave up. */
  powerdown(mix, t, { gain = 1 } = {}) {
    ;[76, 72, 67, 60].forEach((m, n) => inst.bell(mix, t + n * 0.16, m, { g: 1.1 * gain, dur: n === 3 ? 1.1 : 0.4, dly: 0.1 }))
  },
  /** Gulp. */
  gulp(mix, t, { gain = 1 } = {}) {
    let ph = 0
    mix.voice(t, 0.16, (i, s) => {
      const p = s / 0.16
      ph += (2 * Math.PI * (p < 0.5 ? 380 - 400 * p : 180 + 500 * (p - 0.5))) / SR
      return Math.sin(ph) * Math.sin(Math.PI * p)
    }, { gain: 0.45 * gain })
  },
  /** Tape rewind: a fast downward whirr with a wobble and a stutter. */
  rewind(mix, t, { gain = 1, dur = 0.4 } = {}) {
    const bp = new Biquad('bp', 4000, 2.2)
    let ph = 0
    mix.voice(t, dur, (i, s) => {
      const p = s / dur
      if (i % 32 === 0) bp.set(5500 * Math.pow(1 - p, 1.4) + 500)
      ph += (2 * Math.PI * (1400 * (1 - p) + 180 + 60 * Math.sin(2 * Math.PI * 38 * s))) / SR
      const gate = Math.floor(s * 90) % 5 === 0 ? 0.35 : 1
      return (bp.run(noise()) * 1.2 + Math.sin(ph) * 0.35) * gate * Math.min(1, s / 0.01) * (1 - Math.pow(p, 6))
    }, { gain: 0.5 * gain, rev: 0.1 })
  },
  /** A loud cold-open hit: sub boom, snap and a short noise burst. */
  slam(mix, t, { gain = 1 } = {}) {
    fx.hit(mix, t, { gain: 1.0 * gain })
    fx.zip(mix, t, { gain: 0.6 * gain, dur: 0.12 })
  },
  /** The WTX sonic logo: three rising marimba-bell notes, then a plate clank. < 1.2 s. */
  stinger(mix, t, { gain = 1 } = {}) {
    ;[[0, 76], [0.11, 81], [0.22, 88]].forEach(([o, m]) => {
      inst.marimba(mix, t + o, m, { g: 1.5 * gain, dur: 0.6, rev: 0.3 })
      inst.bell(mix, t + o, m + 12, { g: 0.7 * gain, dur: 0.8 })
    })
    fx.clank(mix, t + 0.36, { gain: 1.1 * gain })
    fx.thud(mix, t + 0.36, { gain: 0.8 * gain })
  },
})

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
const DUCKERS = new Set(['kick', 'hit', 'impact', 'plate', 'kick808', 'chipKick', 'thud', 'heart', 'stinger', 'slam', 'boom', 'dundun'])
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
    if (STYLED.has(sec.part)) {
      arrangeStyled(mix, sec, beat, inst, fx)
      continue
    }
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


const STYLED = new Set(['phonk', 'phonk-lite', 'cartoon', 'uke', 'lofi', 'chip', 'chip-lite', 'pop', 'synth', 'ambient', 'doodle'])

// Original 4-bar whistle tune over C – Am – F – G, as [beat, midi, beats].
const UKE_TUNE = [
  [[0, 76, 0.5], [0.5, 76, 0.5], [1, 79, 1], [2, 76, 0.5], [2.5, 72, 0.5], [3, 74, 1]],
  [[0, 76, 0.5], [0.5, 76, 0.5], [1, 81, 1], [2, 79, 0.5], [2.5, 76, 0.5], [3, 72, 1]],
  [[0, 77, 0.5], [0.5, 77, 0.5], [1, 81, 1], [2, 77, 0.5], [2.5, 74, 0.5], [3, 72, 1]],
  [[0, 74, 0.5], [0.5, 76, 0.5], [1, 79, 1], [2, 79, 1.5]],
]
const UKE_CHORDS = [
  [55, 60, 64, 67], // C
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [55, 59, 62, 67], // G
]
const UKE_ROOTS = [36, 33, 29, 31]

function arrangeStyled(mix, sec, beat, inst, fx) {
  const bar = beat * 4
  const part = sec.part
  const gain = sec.gain ?? 1
  const step = beat / 4
  for (let b = 0; b < sec.bars; b++) {
    const t0 = sec.at + b * bar
    const gBar = ((Math.round(t0 / bar) % 4) + 4) % 4
    const last = b === sec.bars - 1
    const progress = sec.bars > 1 ? b / (sec.bars - 1) : 1

    if (part === 'phonk' || part === 'phonk-lite') {
      // A Phrygian: A – Bb – A – G in the sub; a 4-note bell loop; cowbell tresillo.
      const roots = [33, 34, 33, 31]
      const root = roots[gBar]
      const loop = [81, 82, 76, 82]
      if (part === 'phonk') {
        for (const s of [0, 6, 10, 14]) inst.kick808(mix, t0 + s * step, gain * (s === 0 ? 1 : 0.85))
        for (const s of [0, 6, 10]) inst.sub808(mix, t0 + s * step, step * (s === 10 ? 3.5 : 5.5), root, gain, { slideTo: s === 10 && last ? root + 7 : null })
        for (const s of [4, 12]) inst.clap(mix, t0 + s * step, gain)
        if (last) for (let s = 0; s < 4; s++) inst.snare(mix, t0 + (12 + s) * step, 0.5 + s * 0.15)
      }
      for (const s of [0, 3, 6, 8, 11, 14]) inst.cowbell(mix, t0 + s * step, gain * (s === 0 ? 1 : 0.8), s % 2 ? 0.25 : -0.1)
      for (let s = 0; s < 16; s++) {
        if (part === 'phonk-lite' && s % 2) continue
        inst.hat(mix, t0 + s * step, { open: s % 4 === 3 && !(s % 8 === 7), g: (s % 4 === 0 ? 0.8 : 0.5) * gain })
      }
      for (let q = 0; q < 4; q++) inst.bell(mix, t0 + q * beat, loop[q] - (gBar === 3 ? 2 : 0), { g: 0.9 * gain, pan: q % 2 ? 0.3 : -0.3, dur: 0.7 })
    }

    if (part === 'cartoon') {
      const roots = [48, 55, 57, 53]
      const r = roots[gBar]
      const triad = [[60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69]][gBar]
      for (let q = 0; q < 4; q++) inst.pizz(mix, t0 + q * beat, q % 2 ? r + 7 - 12 : r - 12, gain)
      for (const q of [1, 3]) inst.woodblock(mix, t0 + q * beat, gain * 0.8)
      for (let e = 0; e < 4; e++) inst.pluck(mix, t0 + e * beat + beat / 2, triad[e % 3] + 12, { g: 1.6 * gain, cutoff: 3000, pan: e % 2 ? 0.3 : -0.3, dly: 0.1 })
      if (b % 2 === 1) for (const [o, m] of [[0, 84], [0.5, 88], [1, 91]]) inst.bell(mix, t0 + beat * (2.5 + o * 0.5), m, { g: 0.6 * gain })
    }

    if (part === 'uke') {
      const ch = UKE_CHORDS[gBar]
      inst.pizz(mix, t0, UKE_ROOTS[gBar] + 12, gain)
      inst.pizz(mix, t0 + beat * 2, UKE_ROOTS[gBar] + 19, gain)
      // D D U U D U
      for (const [o, up] of [[0, 0], [1, 0], [1.5, 1], [2.5, 1], [3, 0], [3.5, 1]]) inst.strum(mix, t0 + o * beat, ch, { up: !!up, g: gain * (o === 0 ? 1 : 0.8) })
      for (let e = 0; e < 8; e++) inst.shaker(mix, t0 + e * (beat / 2), gain * (e % 2 ? 1 : 0.6))
      if (sec.melody !== false) for (const [o, m, d] of UKE_TUNE[gBar]) inst.whistle(mix, t0 + o * beat, d * beat * 0.9, m, { g: gain })
    }

    if (part === 'lofi') {
      const ch = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 60]][gBar]
      const r = [33, 38, 31, 36][gBar]
      inst.rhodes(mix, t0, bar * 0.95, ch, { g: gain })
      inst.vinyl(mix, t0, bar, gain)
      inst.kick(mix, t0, 0.7 * gain)
      inst.kick(mix, t0 + step * 10, 0.55 * gain)
      for (const q of [1, 3]) inst.snare(mix, t0 + q * beat, 0.45 * gain)
      for (let e = 0; e < 8; e++) inst.hat(mix, t0 + e * (beat / 2) + (e % 2 ? beat / 6 : 0), { g: (0.4 + rand() * 0.3) * gain, pan: 0.1 })
      inst.sub808(mix, t0, beat * 1.8, r, 0.9 * gain)
      inst.sub808(mix, t0 + beat * 2.5, beat * 1.2, r + (gBar % 2 ? 7 : 12), 0.7 * gain)
      if (b % 2 === 1) for (const [o, m] of [[0.5, 83], [1.5, 79], [3, 76]]) inst.bell(mix, t0 + o * beat, m, { g: 0.55 * gain, dly: 0.45 })
    }

    if (part === 'chip' || part === 'chip-lite') {
      const triad = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]][gBar]
      const r = [33, 29, 24, 31][gBar]
      for (let s = 0; s < 16; s++) {
        const pat = [0, 1, 2, 1][s % 4]
        inst.square(mix, t0 + s * step, step * 0.9, triad[pat] + 12 + (s % 8 >= 4 ? 12 : 0), { g: 0.9 * gain, duty: s % 2 ? 0.25 : 0.5, pan: s % 2 ? 0.3 : -0.3 })
      }
      for (let e = 0; e < 8; e++) inst.tri(mix, t0 + e * (beat / 2), beat / 2.2, r + 12 * (e % 2) + (e === 7 ? 7 : 0), gain)
      if (part === 'chip') {
        for (let q = 0; q < 4; q++) inst.chipKick(mix, t0 + q * beat, gain)
        for (const q of [1, 3]) inst.chipSnare(mix, t0 + q * beat, gain)
        for (let e = 0; e < 8; e++) inst.chipHat(mix, t0 + e * (beat / 2) + beat / 4, gain, e % 4 === 3)
      }
      if (last && sec.fill) for (let s = 0; s < 4; s++) inst.chipSnare(mix, t0 + (12 + s) * step, 0.6 + s * 0.2)
    }

    if (part === 'pop') {
      const ch = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [60, 65, 69]][gBar]
      const r = [36, 31, 33, 29][gBar]
      for (let q = 0; q < 4; q++) inst.kick(mix, t0 + q * beat, 0.7 * gain)
      for (const q of [1, 3]) inst.clap(mix, t0 + q * beat, gain)
      for (let e = 0; e < 8; e++) inst.hat(mix, t0 + e * (beat / 2) + beat / 4, { g: 0.7 * gain, open: e % 2 === 1 })
      for (let e = 0; e < 8; e++) inst.bass(mix, t0 + e * (beat / 2), beat / 2.6, r + (e % 4 === 3 ? 12 : 0) + 12, 0.9 * gain)
      for (const o of [0.5, 1.5, 2, 3]) for (const m of ch) inst.marimba(mix, t0 + o * beat, m + 12, { g: 0.55 * gain, dur: 0.3 })
      for (let s = 0; s < 8; s++) inst.pluck(mix, t0 + s * (beat / 2), ch[s % 3] + 24, { g: 0.8 * gain, cutoff: 5000, pan: s % 2 ? 0.4 : -0.4 })
    }

    if (part === 'synth') {
      const r = [33, 29, 36, 31][gBar]
      const triad = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]][gBar]
      for (let q = 0; q < 4; q++) inst.kick(mix, t0 + q * beat, gain)
      for (const q of [1, 3]) inst.snare(mix, t0 + q * beat, 0.8 * gain)
      for (let s = 0; s < 16; s++) inst.bass(mix, t0 + s * step, step * 0.8, r + (s % 8 === 6 ? 12 : 0), 0.8 * gain)
      for (let s = 0; s < 16; s++) inst.square(mix, t0 + s * step + step * 0.5, step * 0.5, triad[(s * 3) % 3] + 24, { g: 0.5 * gain, duty: 0.25, pan: s % 2 ? 0.5 : -0.5 })
      for (let e = 0; e < 8; e++) inst.hat(mix, t0 + e * (beat / 2) + beat / 4, { g: 0.7 * gain })
      if (progress > 0.7) fx.glitch(mix, t0 + beat * 3.5, { gain: 0.5 * gain, dur: 0.18 })
    }

    if (part === 'ambient') {
      const ch = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [55, 59, 62, 66]][gBar]
      inst.pad(mix, t0, bar, ch, { g: 1.3 * gain, cutoff: 1300 })
      if (b % 2 === 0) inst.drone(mix, t0, bar * 2, [33, 29][(b / 2) % 2], gain)
      for (let q = 0; q < 2; q++) inst.heart(mix, t0 + q * beat * 2, 0.45 * gain)
      for (const [o, m] of [[1, 88], [2.5, 84], [3.25, 91]]) if ((b + o) % 2 < 1.5) inst.bell(mix, t0 + o * beat, m, { g: 0.6 * gain, dly: 0.5, dur: 1.4 })
    }

    if (part === 'doodle') {
      const ch = [[64, 67, 72], [64, 69, 72], [65, 69, 72], [62, 67, 71]][gBar]
      const r = [36, 33, 29, 31][gBar]
      for (let q = 0; q < 4; q++) inst.pizz(mix, t0 + q * beat, q % 2 ? r + 7 : r, gain)
      for (const q of [1, 3]) inst.brush(mix, t0 + q * beat, gain)
      for (let e = 0; e < 8; e++) inst.shaker(mix, t0 + e * (beat / 2), gain * (e % 2 ? 1 : 0.5))
      for (const [o, i] of [[0.5, 0], [1.5, 1], [2, 2], [3.5, 1]]) inst.marimba(mix, t0 + o * beat, ch[i], { g: 0.9 * gain, pan: i - 1 ? 0.25 : -0.25 })
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
  if (audio.voice) mixVoice(mix, audio.voice)
  writeWav(outPath, mix.L, mix.R)
}

/**
 * Lays a voice-over on the finished bed. The recording is cleaned up
 * (rumble cut, gentle compression, levelled) and the bed ducks ~9 dB
 * whenever the voice is talking, with a smooth release between phrases.
 */
function mixVoice(mix, { file, at, gain }) {
  const r = spawnSync(ffmpegPath, [
    '-v', 'error', '-i', join(VIDEOS_DIR, file),
    '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=150,loudnorm=I=-16:TP=-2',
    '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-',
  ], { maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(`voice-over: cannot read ${file}\n${r.stderr}`)
  const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4)
  const start = Math.round(at * SR)
  const attack = Math.exp(-1 / (0.01 * SR))
  const release = Math.exp(-1 / (0.3 * SR))
  let env = 0
  let peak = 0
  for (let k = 0; k < mix.n; k++) {
    const j = k - start
    const vl = j >= 0 && j * 2 + 1 < pcm.length ? pcm[j * 2] * gain : 0
    const vr = j >= 0 && j * 2 + 1 < pcm.length ? pcm[j * 2 + 1] * gain : 0
    const level = Math.max(Math.abs(vl), Math.abs(vr))
    env = level > env ? attack * env + (1 - attack) * level : release * env + (1 - release) * level
    const duck = 1 - 0.65 * Math.min(1, env / 0.04)
    mix.L[k] = mix.L[k] * duck + vl
    mix.R[k] = mix.R[k] * duck + vr
    peak = Math.max(peak, Math.abs(mix.L[k]), Math.abs(mix.R[k]))
  }
  if (peak > 0.95) {
    const g = 0.95 / peak
    for (let k = 0; k < mix.n; k++) {
      mix.L[k] *= g
      mix.R[k] *= g
    }
  }
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
