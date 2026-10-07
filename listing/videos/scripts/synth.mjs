// DSP primitives and the mix bus shared by the soundtrack (music.mjs) and the
// per-video styles (soundtracks.mjs). 48 kHz, plain JS, no samples.

export const SR = 48000

/* ---------- DSP building blocks ---------- */

export function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const rand = mulberry32(0x5eed)
export const noise = () => rand() * 2 - 1

/** RBJ biquad; `set()` may be called per block for sweeps. */
export class Biquad {
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

export function polyblep(t, dt) {
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

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12)

/* ---------- the mix bus ---------- */

export class Mix {
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
