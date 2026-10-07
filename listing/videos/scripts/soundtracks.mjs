// Per-video soundtracks: twenty original styles, synthesized like the launch
// track in music.mjs (no samples, nothing to license), so that no two reels
// carry the same audio. A track is { style, key, prog, seed }: the style sets
// the tempo, drum feel and instruments; the key and progression move the
// harmony and pick between a style's pattern alternates; the seed writes the
// melody. Which reel gets which track is in tracks.mjs.
//
// Tempos are multiples of 30 BPM, so a sixteenth is a whole number of frames
// at 30 fps and every half-second cut in a composition still lands on the
// grid. A composition's sections ({ at, bars, part }) are authored in
// 2-second bars; here each section is refilled with bars of the style's own
// length, restarting on the downbeat, so a drop always opens on the tonic.

import { SR, mulberry32, noise, Biquad, polyblep, midiHz } from './synth.mjs'

const TAU = Math.PI * 2
const saw = (ph, dt) => 2 * ph - 1 - polyblep(ph, dt)
const pulse = (ph, dt, duty) => saw(ph, dt) - saw((ph + duty) % 1, dt)
/** Attack, hold for `dur`, then release. */
const gate = (s, dur, a = 0.004, r = 0.03) => Math.min(1, s / a) * (s > dur ? Math.exp(-(s - dur) / r) : 1)

/* ---------- voices ---------- */

const V = {
  kick(mix, t, { g = 1, f = 46, sweep = 120, sweepT = 0.03, dec = 0.3, drive = 1.8, click = 0.35, duck = 0.7, rel = 0.16 } = {}) {
    let ph = 0
    mix.voice(t, Math.min(1.6, dec * 4 + 0.1), (i, s) => {
      ph += (TAU * (f + sweep * Math.exp(-s / sweepT))) / SR
      return Math.tanh((Math.sin(ph) * Math.exp(-s / dec) + noise() * Math.exp(-s / 0.0025) * click) * drive) * 0.9
    }, { gain: g })
    if (duck) mix.addDuck(t, duck, rel)
  },
  /** Hardstyle kick: a click, then a distorted tail held at the chord's root. */
  hardkick(mix, t, { g = 1, midi = 41, hold = 0.3 } = {}) {
    const f0 = midiHz(midi)
    const lp = new Biquad('lp', 3000, 0.8)
    let ph = 0
    mix.voice(t, hold + 0.1, (i, s) => {
      ph += (TAU * (f0 + 240 * Math.exp(-s / 0.016))) / SR
      const body = Math.sin(ph)
      if (i % 32 === 0) lp.set(1100 + 5000 * Math.exp(-s / 0.05))
      const env = s > hold ? Math.exp(-(s - hold) / 0.02) : 1
      return (lp.run(Math.tanh(body * 6) * 0.75 + body * 0.25) + noise() * Math.exp(-s / 0.002) * 0.3) * env
    }, { gain: 0.72 * g })
    mix.addDuck(t, 0.85, 0.2)
  },
  stomp(mix, t, { g = 1 } = {}) {
    const lp = new Biquad('lp', 900, 0.7)
    let ph = 0
    mix.voice(t, 0.5, (i, s) => {
      ph += (TAU * (52 + 60 * Math.exp(-s / 0.03))) / SR
      return Math.tanh((Math.sin(ph) * Math.exp(-s / 0.16) + lp.run(noise()) * Math.exp(-s / 0.05) * 0.9) * 2)
    }, { gain: 0.85 * g, rev: 0.3 })
    mix.addDuck(t, 0.6, 0.2)
  },
  snare(mix, t, { g = 1, tone = 185, dec = 0.11, ndec = 0.13, hp = 1800, rev = 0.2 } = {}) {
    const f = new Biquad('hp', hp, 0.7)
    let ph = 0
    mix.voice(t, 0.5, (i, s) => {
      ph += (TAU * (tone + 80 * Math.exp(-s / 0.02))) / SR
      return Math.sin(ph) * Math.exp(-s / dec) * 0.6 + f.run(noise()) * Math.exp(-s / ndec) * 0.8
    }, { gain: 0.5 * g, rev })
  },
  clap(mix, t, { g = 1, rev = 0.35 } = {}) {
    const bp = new Biquad('bp', 1500, 0.9)
    mix.voice(t, 0.4, (i, s) => {
      const burst = [0, 0.009, 0.019].reduce((a, o) => a + (s >= o ? Math.exp(-(s - o) / 0.004) : 0), 0)
      return bp.run(noise()) * (burst * 0.8 + Math.exp(-s / 0.14) * 0.5) * 1.6
    }, { gain: 0.55 * g, rev })
  },
  rim(mix, t, { g = 1 } = {}) {
    const bp = new Biquad('bp', 1700, 3)
    let ph = 0
    mix.voice(t, 0.08, (i, s) => {
      ph += (TAU * 1700) / SR
      return (Math.sin(ph) * 0.6 + bp.run(noise()) * 1.2) * Math.exp(-s / 0.012)
    }, { gain: 0.4 * g, pan: -0.2, rev: 0.15 })
  },
  snap(mix, t, { g = 1 } = {}) {
    const bp = new Biquad('bp', 2400, 2)
    mix.voice(t, 0.15, (i, s) => bp.run(noise()) * (Math.exp(-s / 0.006) + Math.exp(-s / 0.05) * 0.3) * 2, { gain: 0.4 * g, pan: 0.2, rev: 0.4 })
  },
  hat(mix, t, { g = 1, open = false, hp = 7500, dec, pan = 0.15 } = {}) {
    const f = new Biquad('hp', hp, 0.8)
    const d = dec ?? (open ? 0.11 : 0.022)
    mix.voice(t, open ? 0.3 : 0.08, (i, s) => f.run(noise()) * Math.exp(-s / d), { gain: (open ? 0.2 : 0.16) * g, pan, rev: 0.05 })
  },
  shaker(mix, t, { g = 1 } = {}) {
    const bp = new Biquad('bp', 6200, 1.1)
    mix.voice(t, 0.09, (i, s) => bp.run(noise()) * Math.min(1, s / 0.008) * Math.exp(-s / 0.03) * 2, { gain: 0.14 * g, pan: -0.3, rev: 0.05 })
  },
  tom(mix, t, { g = 1, f = 150, dec = 0.13, pan = 0.25 } = {}) {
    let ph = 0
    mix.voice(t, 0.4, (i, s) => {
      ph += (TAU * f * (1 + 0.6 * Math.exp(-s / 0.03))) / SR
      return Math.sin(ph) * Math.exp(-s / dec) + noise() * Math.exp(-s / 0.003) * 0.2
    }, { gain: 0.42 * g, pan, rev: 0.2 })
  },
  clave(mix, t, { g = 1 } = {}) {
    let ph = 0
    mix.voice(t, 0.1, (i, s) => {
      ph += (TAU * 2500) / SR
      return Math.sin(ph) * Math.exp(-s / 0.025)
    }, { gain: 0.2 * g, pan: 0.35, rev: 0.3 })
  },
  /** Low-level record crackle under a lo-fi bar. */
  vinyl(mix, t, dur) {
    const lp = new Biquad('lp', 5000, 0.7)
    let pop = 0
    mix.voice(t, dur, () => {
      if (noise() > 0.9993) pop = noise() > 0 ? 1 : -1
      pop *= 0.82
      return lp.run(noise()) * 0.012 + pop * 0.06
    }, { gain: 1, pan: 0 })
  },

  /* bass */
  bass808(mix, t, dur, midi, { g = 1, drive = 2.5, glide = 0, dec = 0.9 } = {}) {
    const f1 = midiHz(midi)
    let ph = 0
    mix.voice(t, dur + 0.1, (i, s) => {
      ph += (TAU * (f1 * Math.pow(2, (glide * Math.exp(-s / 0.07)) / 12) + 40 * Math.exp(-s / 0.012))) / SR
      const env = Math.min(1, s / 0.003) * Math.exp(-s / dec) * (s > dur ? Math.exp(-(s - dur) / 0.025) : 1)
      return Math.tanh(Math.sin(ph) * drive * env) + Math.sin(ph * 2) * 0.12 * env
    }, { gain: 0.46 * g, duck: 0.5 })
  },
  sub(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    let ph = 0
    mix.voice(t, dur + 0.15, (i, s) => {
      ph += (TAU * f) / SR
      return (Math.sin(ph) + Math.sin(ph * 2) * 0.25 + Math.sin(ph * 3) * 0.1) * gate(s, dur, 0.01, 0.06)
    }, { gain: 0.4 * g, duck: 0.85 })
  },
  sawbass(mix, t, dur, midi, { g = 1, cutoff = 900 } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', 700, 0.9)
    let ph = 0
    mix.voice(t, dur + 0.06, (i, s) => {
      ph = (ph + f / SR) % 1
      if (i % 32 === 0) lp.set(250 + cutoff * Math.exp(-s / 0.08))
      return (lp.run(saw(ph, f / SR)) * 0.55 + Math.sin(TAU * ph) * 0.7) * gate(s, dur, 0.004, 0.015)
    }, { gain: 0.42 * g, duck: 0.85 })
  },
  reese(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', 500, 1.2)
    let p1 = 0
    let p2 = 0.4
    mix.voice(t, dur + 0.08, (i, s) => {
      p1 = (p1 + (f * 0.993) / SR) % 1
      p2 = (p2 + (f * 1.007) / SR) % 1
      if (i % 32 === 0) lp.set(380 + 500 * (0.5 + 0.5 * Math.sin(TAU * 1.5 * s)))
      return (lp.run(saw(p1, f / SR) + saw(p2, f / SR)) * 0.6 + Math.sin(TAU * p1) * 0.5) * gate(s, dur, 0.01, 0.04)
    }, { gain: 0.36 * g, duck: 0.8 })
  },
  /** Amapiano log drum: a pitched, slightly driven thump. */
  logdrum(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    let ph = 0
    mix.voice(t, 0.6, (i, s) => {
      ph += (TAU * f * Math.pow(2, Math.exp(-s / 0.012))) / SR
      return Math.tanh(Math.sin(ph) * 2.4 * Math.exp(-s / 0.22)) + noise() * Math.exp(-s / 0.002) * 0.15
    }, { gain: 0.5 * g, duck: 0.4 })
  },
  tri(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    let ph = 0
    mix.voice(t, dur + 0.02, (i, s) => {
      ph = (ph + f / SR) % 1
      return (4 * Math.abs(ph - 0.5) - 1) * gate(s, dur, 0.002, 0.008)
    }, { gain: 0.36 * g, duck: 0.3 })
  },

  /* chords and melody */
  pad(mix, t, dur, midis, { g = 1, cutoff = 1800 } = {}) {
    midis.forEach((m, n) => {
      for (const [det, pan] of [[-0.11, -0.7], [0, 0], [0.12, 0.7]]) {
        const f = midiHz(m + det)
        const lp = new Biquad('lp', cutoff, 0.7)
        let ph = (noise() + 1) / 2
        mix.voice(t, dur + 0.8, (i, s) => {
          ph = (ph + f / SR) % 1
          return lp.run(saw(ph, f / SR)) * Math.min(1, s / 0.3) * (s > dur ? Math.exp(-(s - dur) / 0.3) : 1)
        }, { gain: 0.045 * g, pan: pan * (n % 2 ? -1 : 1), rev: 0.5, duck: 0.75 })
      }
    })
  },
  supersaw(mix, t, dur, midi, { g = 1, cutoff = 5200, dly = 0.2, rev = 0.3 } = {}) {
    for (const [det, pan] of [[-0.19, -0.8], [-0.08, -0.35], [0, 0], [0.09, 0.35], [0.18, 0.8]]) {
      const f = midiHz(midi + det)
      const lp = new Biquad('lp', cutoff, 0.8)
      let ph = (noise() + 1) / 2
      mix.voice(t, dur + 0.25, (i, s) => {
        ph = (ph + f / SR) % 1
        return lp.run(saw(ph, f / SR)) * gate(s, dur, 0.006, 0.07)
      }, { gain: 0.036 * g, pan, rev, dly, duck: 0.6 })
    }
  },
  /** Short filtered saw chord note: house, disco and reggaeton stabs. */
  stab(mix, t, dur, midi, { g = 1, cutoff = 3400 } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', cutoff, 1.4)
    let p1 = 0
    let p2 = 0.5
    mix.voice(t, dur + 0.15, (i, s) => {
      p1 = (p1 + f / SR) % 1
      p2 = (p2 + (f * 1.008) / SR) % 1
      if (i % 32 === 0) lp.set(500 + cutoff * Math.exp(-s / 0.12))
      return lp.run(saw(p1, f / SR) + saw(p2, f / SR)) * gate(s, dur, 0.003, 0.04)
    }, { gain: 0.05 * g, pan: (midi % 3) * 0.3 - 0.3, rev: 0.25, duck: 0.5 })
  },
  piano(mix, t, dur, midi, { g = 1, pan = 0 } = {}) {
    const f = midiHz(midi)
    const phs = [0, 0, 0, 0, 0, 0]
    mix.voice(t, dur + 0.5, (i, s) => {
      let v = 0
      for (let k = 1; k <= 6; k++) {
        phs[k - 1] += (TAU * f * k * Math.sqrt(1 + 0.0004 * k * k)) / SR
        v += (Math.sin(phs[k - 1]) / Math.pow(k, 1.25)) * Math.exp(-s / (1.5 / Math.pow(k, 0.8)))
      }
      return (v + noise() * Math.exp(-s / 0.004) * 0.15) * gate(s, dur, 0.002, 0.18)
    }, { gain: 0.1 * g, pan, rev: 0.3, duck: 0.3 })
  },
  epiano(mix, t, dur, midi, { g = 1, pan = 0 } = {}) {
    const f = midiHz(midi)
    let pc = 0
    let pm = 0
    mix.voice(t, dur + 0.5, (i, s) => {
      pm += (TAU * f) / SR
      pc += (TAU * f) / SR
      const trem = 1 - 0.15 * (0.5 + 0.5 * Math.sin(TAU * 4.5 * s))
      return Math.sin(pc + Math.sin(pm) * 1.5 * Math.exp(-s / 0.4)) * Math.exp(-s / 1.4) * trem * gate(s, dur, 0.004, 0.2)
    }, { gain: 0.085 * g, pan, rev: 0.35, duck: 0.4 })
  },
  bell(mix, t, dur, midi, { g = 1, pan = 0, dly = 0.3 } = {}) {
    const f = midiHz(midi)
    let pc = 0
    let pm = 0
    mix.voice(t, 1.4, (i, s) => {
      pm += (TAU * f * 3.01) / SR
      pc += (TAU * f) / SR
      return Math.sin(pc + Math.sin(pm) * 1.8 * Math.exp(-s / 0.18)) * Math.exp(-s / 0.45) * Math.min(1, s / 0.002)
    }, { gain: 0.14 * g, pan, rev: 0.45, dly, duck: 0.3 })
  },
  pluck(mix, t, dur, midi, { g = 1, cutoff = 4200, pan = 0, dly = 0.35, dec = 0.16 } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', cutoff, 1.2)
    let p1 = 0
    let p2 = 0.37
    mix.voice(t, 0.5, (i, s) => {
      p1 = (p1 + f / SR) % 1
      p2 = (p2 + (f * 1.006) / SR) % 1
      if (i % 32 === 0) lp.set(300 + cutoff * Math.exp(-s / 0.09))
      return lp.run(saw(p1, f / SR) + saw(p2, (f * 1.006) / SR)) * Math.exp(-s / dec) * Math.min(1, s / 0.002)
    }, { gain: 0.13 * g, pan, rev: 0.25, dly, duck: 0.4 })
  },
  square(mix, t, dur, midi, { g = 1, duty = 0.5, pan = 0, dly = 0.12 } = {}) {
    const f = midiHz(midi)
    let ph = 0
    mix.voice(t, dur + 0.03, (i, s) => {
      ph = (ph + (f * (1 + 0.004 * Math.sin(TAU * 6 * s) * Math.min(1, s / 0.15))) / SR) % 1
      return pulse(ph, f / SR, duty) * gate(s, dur, 0.002, 0.012)
    }, { gain: 0.075 * g, pan, rev: 0.12, dly, duck: 0.3 })
  },
  /** Phonk cowbell: two detuned squares through a band-pass, pitched per note. */
  cowbell(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    const bp = new Biquad('bp', Math.min(f * 2.2, 5000), 1.6)
    let p1 = 0
    let p2 = 0
    mix.voice(t, 0.45, (i, s) => {
      p1 = (p1 + f / SR) % 1
      p2 = (p2 + (f * 1.4836) / SR) % 1
      const x = pulse(p1, f / SR, 0.5) + pulse(p2, (f * 1.4836) / SR, 0.5)
      return (bp.run(x) * 1.4 + x * 0.25) * (Math.exp(-s / 0.015) * 0.5 + Math.exp(-s / 0.16) * 0.5) * Math.min(1, s / 0.001)
    }, { gain: 0.15 * g, pan: 0.1, rev: 0.28, dly: 0.12, duck: 0.35 })
  },
  whistle(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    const bp = new Biquad('bp', f, 8)
    let ph = 0
    mix.voice(t, dur + 0.1, (i, s) => {
      ph += (TAU * f * (1 + 0.012 * Math.sin(TAU * 5.5 * s) * Math.min(1, s / 0.12))) / SR
      return (Math.sin(ph) + bp.run(noise()) * 0.5) * gate(s, dur, 0.02, 0.05)
    }, { gain: 0.12 * g, pan: -0.1, rev: 0.35, dly: 0.2, duck: 0.3 })
  },
  brass(mix, t, dur, midi, { g = 1 } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', 800, 1)
    let p1 = 0
    let p2 = 0.3
    mix.voice(t, dur + 0.12, (i, s) => {
      p1 = (p1 + (f * 0.996) / SR) % 1
      p2 = (p2 + (f * 1.004) / SR) % 1
      if (i % 32 === 0) lp.set(600 + 2600 * Math.min(1, s / 0.04) * Math.exp(-s / 0.5))
      return lp.run(saw(p1, f / SR) + saw(p2, f / SR)) * gate(s, dur, 0.015, 0.05)
    }, { gain: 0.085 * g, pan: 0.15, rev: 0.3, duck: 0.4 })
  },
  /** Acid line: a saw through a resonant low-pass that snaps shut on every note. */
  acid(mix, t, dur, midi, { g = 1, accent = false } = {}) {
    const f = midiHz(midi)
    const lp = new Biquad('lp', 600, 6)
    let ph = 0
    mix.voice(t, dur + 0.05, (i, s) => {
      ph = (ph + f / SR) % 1
      if (i % 16 === 0) lp.set(280 + (accent ? 3000 : 1400) * Math.exp(-s / 0.08), 6)
      return Math.tanh(lp.run(saw(ph, f / SR)) * 0.9) * gate(s, dur, 0.003, 0.02)
    }, { gain: (accent ? 0.2 : 0.15) * g, pan: 0.1, dly: 0.25, rev: 0.1, duck: 0.6 })
  },
}

/* ---------- styles ---------- */

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
}
// Scale degrees the melody may use; five-note sets sit safely over every chord.
const PENT = { minor: [0, 2, 3, 4, 6], major: [0, 1, 2, 4, 5], dorian: [0, 2, 3, 4, 6], phrygian: [0, 1, 2, 4, 5], harmonic: [0, 2, 3, 4, 6] }
const ALL = [0, 1, 2, 3, 4, 5, 6]

// Drum grids are 16 sixteenths: x hit, X accent, o ghost, r two-stroke roll, t triplet roll.
const FOUR = 'x...x...x...x...'
const BACK = '....x.......x...'
const OFF = '..x...x...x...x.'
const H8 = 'x.x.x.x.x.x.x.x.'
const H8Q = 'o.o.o.o.o.o.o.o.'
const H16 = 'xoxoxoxoxoxoxoxo'

/**
 * drums.full plays in `drop` and `drive`, drums.light in `break` and `intro`.
 * A pattern given as an array is a set of alternates: the track's progression
 * number picks one.
 * bass.pat '@kick' follows the kick. Melody rhythms span two bars (32 steps).
 */
export const STYLES = {
  phonk: {
    label: 'Drift phonk: cowbell riff, distorted 808',
    bpm: 150, scale: 'phrygian',
    progs: [[0, 0, 1, 0], [0, 5, 1, 0], [0, 0, 5, 6], [0, 3, 1, 0]],
    kit: { kick: { drive: 3.2, dec: 0.2, sweep: 160, click: 0.5 }, hat: { dec: 0.018 } },
    drums: {
      full: { kick: ['x.....x...x..x..', 'x..x..x...x.x...', 'x...x...x...x...'], clap: BACK, hat: ['x.xxx.xxx.xxx.xx', 'xxx.xxx.xxx.xxx.'], ohat: '..............x.' },
      light: { hat: H8 },
    },
    bass: { voice: 'bass808', pat: '@kick', len: 3, drive: 3.5 },
    pad: { g: 0.5, cutoff: 900 },
    lead: { voice: 'cowbell', oct: 3, len: 2, rhythms: ['x.xx.x.xx.x.x.x.x.xx.x.xx.x.xxx.', 'x..x..x.x..x.xx.x..x..x.x.xx.x..', 'xx.x.xx.x.x.xx.xxx.x.xx.x.x.x.xx', 'x.x.xx.x..x.x.x.x.x.xx.x.xxx.x..'] },
  },
  brasil: {
    label: 'Brazilian funk: tamborzão drums, 808, staccato lead',
    bpm: 120, scale: 'minor',
    progs: [[0, 0, 0, 0], [0, 0, 5, 6], [0, 6, 0, 6], [0, 0, 3, 4]],
    kit: { kick: { drive: 3, dec: 0.24 }, snare: { tone: 230, ndec: 0.07, hp: 2400 } },
    drums: {
      full: { kick: ['x.......x.x.....', 'x..x....x.x.....'], snare: '...x..x.....x...', shaker: H16 },
      light: { rim: '...x..x.....x...', shaker: H16 },
    },
    bass: { voice: 'bass808', pat: '@kick', len: 2, drive: 4 },
    lead: { voice: ['square', 'cowbell', 'whistle'], oct: 3, len: 1.5, duty: 0.25, rhythms: ['x..x..x.x..x..x.x..x..x.x.x.x.x.', 'x.x..x.x..x.x...x.x..x.x..xxx...', 'x..x.x..x..x.x..x..x.x..x.xx.xx.'] },
  },
  hardstyle: {
    label: 'Hardstyle: distorted kick on every beat, supersaw melody',
    bpm: 150, scale: 'minor', leadScale: ALL,
    progs: [[0, 5, 2, 6], [0, 5, 6, 4], [5, 6, 0, 0], [0, 2, 6, 5]],
    drums: { full: { hkick: FOUR, ohat: OFF, clap: '....o.......o...' }, light: {} },
    chords: { voice: 'supersaw', pat: 'x.......x.......', len: 7, g: 0.55, drive: 0.5 },
    pad: { g: 0.6, cutoff: 1500, only: ['break', 'intro', 'build'] },
    lead: { voice: 'supersaw', oct: 3, len: 3, rhythms: ['x.x.x..x.x.x.x..x.x.x..x.xx.x...', 'x..x..x.x.x.x.x.x..x..x.x.x.xx..', 'x.xxx.x.x.x.x...x.xxx.x.x.xxx...'] },
  },
  trap: {
    label: 'Trap: half-time snare, rolling hats, bell melody',
    bpm: 150, scale: 'minor',
    progs: [[0, 0, 5, 4], [0, 5, 0, 6], [0, 0, 3, 3], [0, 6, 5, 4]],
    kit: { kick: { dec: 0.16, drive: 2.2 }, snare: { tone: 200, ndec: 0.16, rev: 0.3 } },
    drums: {
      full: { kick: ['x.........x..x..', 'x......x..x.....', 'x.....x......x..'], snare: '........x.......', hat: ['x.x.x.x.x.xrx.x.', 'x.x.xrx.x.x.x.tx', 'xxx.x.x.x.x.xrxr'] },
      light: { hat: H8Q },
      fill: { hat: 'x.x.x.rrx.x.rrrr' },
    },
    bass: { voice: 'bass808', pat: '@kick', len: 6, drive: 2.6, glide: 0.3 },
    pad: { g: 0.5, cutoff: 1100 },
    lead: { voice: 'bell', oct: 3, len: 6, rhythms: ['x...x..x....x...x...x..x..x.....', 'x..x....x..x....x..x....x.x.x...', 'x.....x.x.....x.x.....x.x..x..x.'] },
  },
  house: {
    label: 'Piano house: four-on-the-floor, offbeat hat, piano stabs',
    bpm: 120, scale: 'minor', sevenths: true,
    progs: [[0, 5, 2, 6], [0, 2, 6, 5], [0, 3, 5, 4], [5, 6, 0, 0]],
    drums: { full: { kick: FOUR, clap: BACK, ohat: OFF, shaker: H16 }, light: { ohat: '..o...o...o...o.', shaker: H16 } },
    bass: { voice: 'sawbass', pat: ['..x...x...x...x.', 'x..x..x...x..x..', 'x.x...x.x.x...x.'], len: 2 },
    chords: { voice: 'piano', pat: ['x..x..x...x..x..', 'x..x...x..x.x...', '..x..x....x..x.x'], len: 2 },
    lead: { voice: 'pluck', oct: 3, len: 4, rhythms: ['x.....x...x.....x.....x...x.x...', '..x...x.....x.....x...x...x.....', 'x...x.....x.x...x...x.....x.....'] },
  },
  techno: {
    label: 'Acid techno: driving kick, 16th-note acid line',
    bpm: 150, scale: 'phrygian',
    progs: [[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 6]],
    kit: { kick: { dec: 0.24, drive: 2.6, f: 48 } },
    drums: { full: { kick: FOUR, ohat: OFF, clap: '....o.......o...', hat: 'oxoooxooxoooxoxo' }, light: { hat: H16 } },
    bass: { voice: 'sub', pat: OFF, len: 1.2 },
    pad: { g: 0.35, cutoff: 800 },
    lead: { voice: 'acid', oct: 1, len: 0.9, range: [-3, 9], rhythms: ['xXx.xx.xXxx.xx.xxXx.xx.xx.xXxxx.', 'x.xXx.xxx.xXx.xxx.xXx.xxx.xxXxxx', 'Xx.xx.xXxx.xx.x.Xx.xx.xXxx.xxxXx'] },
  },
  synthwave: {
    label: 'Synthwave: octave bass, gated snare, wide pads',
    bpm: 120, scale: 'minor',
    progs: [[0, 5, 2, 6], [0, 6, 5, 6], [5, 6, 0, 0], [0, 3, 5, 4]],
    kit: { kick: { drive: 1.5 }, snare: { dec: 0.16, ndec: 0.22, rev: 0.55, g: 1.2 } },
    drums: { full: { kick: FOUR, snare: BACK, hat: H8Q }, light: { hat: H8Q } },
    bass: { voice: 'sawbass', pat: H8, len: 1.5, notes: 'octave', cutoff: 1300 },
    pad: { g: 1, cutoff: 2600 },
    arp: { voice: 'pluck', pat: 'x.xxx.xxx.xxx.xx', g: 0.45, only: ['drop', 'break'] },
    lead: { voice: 'supersaw', oct: 3, len: 6, g: 0.9, rhythms: ['x...x...x.x.....x...x...x..x....', 'x.....x.x...x...x.....x.x.x.....', 'x..x..x.....x.x.x..x..x.....x...'] },
  },
  lofi: {
    label: 'Lo-fi hip hop: swung drums, electric piano, vinyl crackle',
    bpm: 90, scale: 'minor', sevenths: true, swing: 0.3, vinyl: true,
    progs: [[3, 6, 2, 5], [0, 5, 3, 4], [5, 6, 0, 0], [0, 3, 5, 6]],
    kit: { kick: { dec: 0.18, drive: 1.2, click: 0.1, sweep: 70, f: 52, duck: 0.5 }, snare: { tone: 200, hp: 900, ndec: 0.09, g: 0.8 }, hat: { hp: 6000, g: 0.6 } },
    drums: { full: { kick: ['x.....x...x.....', 'x..x......x.....', 'x.....x..x.x....'], snare: BACK, hat: H8 }, light: { hat: H8Q } },
    bass: { voice: 'sub', pat: ['x.....x...x.....', 'x.......x.x.....'], len: 5 },
    chords: { voice: 'epiano', pat: ['x.....x.........', 'x.......x.......', 'x..x............'], len: 7 },
    lead: { voice: ['bell', 'piano'], oct: 3, len: 4, rhythms: ['x...x.x.....x...x...x.x.....x.x.', '..x.x...x.......x.x...x.....x...', 'x.x...x...x.....x.x...x.x.......'] },
  },
  reggaeton: {
    label: 'Reggaeton: dembow drums, offbeat stabs, sung-style lead',
    bpm: 90, scale: 'minor',
    progs: [[0, 5, 2, 6], [0, 5, 6, 4], [5, 2, 6, 0], [0, 3, 5, 4]],
    kit: { kick: { dec: 0.2, drive: 2 }, snare: { tone: 220, ndec: 0.08, hp: 2200 } },
    drums: { full: { kick: FOUR, snare: '...x..x....x..x.', hat: H8Q }, light: { rim: '...x..x....x..x.' } },
    bass: { voice: 'bass808', pat: ['x..x..x.x..x..x.', 'x.....x.x.....x.'], len: 3, drive: 2 },
    chords: { voice: 'stab', pat: OFF, len: 1.5, g: 0.8 },
    lead: { voice: ['whistle', 'pluck', 'bell'], oct: 3, len: 3, rhythms: ['x..x..x.x.x.....x..x..x.x.x.x...', 'x.x.x..x..x.....x.x.x..x..x.x...', '..x.x.x...x.x.....x.x.x...x.xx..'] },
  },
  dnb: {
    label: 'Drum and bass: breakbeat, reese bass, bell arpeggio',
    bpm: 180, scale: 'minor', sevenths: true, hold: 2,
    progs: [[0, 5, 2, 6], [0, 0, 5, 6], [0, 3, 5, 4]],
    kit: { kick: { dec: 0.16, drive: 2 }, snare: { tone: 210, ndec: 0.12, g: 1.1 } },
    drums: { full: { kick: ['x.........x.....', 'x.....x...x.....'], snare: BACK, hat: H8, rim: '.......o.o.....o' }, light: { hat: H8Q } },
    bass: { voice: 'reese', pat: ['x.......x..x....', 'x.....x...x.....'], len: 6 },
    pad: { g: 0.8, cutoff: 2400 },
    lead: { voice: ['bell', 'pluck'], oct: 3, len: 3, rhythms: ['x..x..x.x..x..x.x..x..x.x.x.x...', 'x.x...x.x.x...x.x.x...x.x.xx....'] },
  },
  jersey: {
    label: 'Jersey club: five-kick bounce, bright stabs',
    bpm: 150, scale: 'major',
    progs: [[0, 4, 5, 3], [3, 4, 5, 5], [0, 5, 3, 4]],
    kit: { kick: { dec: 0.16, drive: 2.4 } },
    drums: { full: { kick: 'x...x...x..x..x.', clap: BACK, hat: H8Q }, light: { hat: H8Q } },
    bass: { voice: 'bass808', pat: '@kick', len: 2, drive: 2.5 },
    chords: { voice: 'stab', pat: ['x..x..x...x..x..', 'x.....x..x..x...'], len: 1.5 },
    lead: { voice: ['pluck', 'square'], oct: 3, len: 2, rhythms: ['x.xx..x.xx..x.x.x.xx..x.xx.xx...', 'xx.x.x..xx.x.x..xx.x.x..x.x.xx..'] },
  },
  amapiano: {
    label: 'Amapiano: log-drum bass, shakers, jazzy keys',
    bpm: 120, scale: 'dorian', sevenths: true,
    progs: [[0, 3, 0, 3], [1, 4, 0, 0], [0, 2, 3, 4], [0, 6, 3, 3]],
    kit: { kick: { dec: 0.16, drive: 1.2, click: 0.15, g: 0.8, duck: 0.4 } },
    drums: { full: { kick: FOUR, shaker: 'xoXoxoXoxoXoxoXo', rim: '..x..x....x..x..' }, light: { shaker: 'xoXoxoXoxoXoxoXo', rim: '..x..x....x..x..' } },
    bass: { voice: 'logdrum', pat: ['x..x..x...x.x...', 'x.....x..x.x..x.', '..x..x.x....x.x.'], len: 2, notes: 'walk' },
    chords: { voice: 'epiano', pat: 'x.........x.....', len: 9 },
    pad: { g: 0.6, cutoff: 1800 },
    lead: { voice: ['bell', 'whistle'], oct: 3, len: 4, rhythms: ['x.....x.x.......x.....x...x.x...', '..x...x...x.x.....x...x.....x...', 'x...x.......x.x.x...x.....x.....'] },
  },
  chiptune: {
    label: 'Chiptune: square-wave melody, fast arpeggios',
    bpm: 150, scale: 'major', leadScale: ALL,
    progs: [[0, 4, 5, 3], [0, 3, 4, 4], [5, 3, 0, 4], [0, 5, 3, 4]],
    kit: { kick: { dec: 0.07, sweep: 300, sweepT: 0.02, f: 60, drive: 1, click: 0, duck: 0.3 }, snare: { tone: 300, dec: 0.03, hp: 1000, ndec: 0.07, rev: 0 }, hat: { dec: 0.012, hp: 9000 } },
    drums: { full: { kick: 'x.....x.x.....x.', snare: BACK, hat: H8 }, light: { hat: H8Q } },
    bass: { voice: 'tri', pat: H8, len: 1.6, notes: 'octave' },
    arp: { voice: 'square', pat: 'xxxxxxxxxxxxxxxx', g: 0.5, duty: 0.125, len: 0.9 },
    lead: { voice: 'square', oct: 3, len: 2, rhythms: ['x.x.xxx.x.x.x...x.x.xxx.x.xxx.x.', 'x..xx.x.x..xx.x.x..xx.x.xxx.x...', 'xx.x.x.xx.x.x...xx.x.x.xx.xxx...'] },
  },
  ambient: {
    label: 'Ambient: slow pads, sparse bells, no hard drums',
    bpm: 90, scale: 'major', sevenths: true,
    progs: [[0, 5, 3, 4], [3, 0, 4, 5], [0, 2, 3, 3], [5, 3, 0, 4]],
    kit: { kick: { dec: 0.25, drive: 1, click: 0, g: 0.7, duck: 0.4 } },
    drums: { full: { kick: 'x.........x.....', shaker: H8Q, snap: '....o.......o...' }, light: {} },
    bass: { voice: 'sub', pat: 'x...............', len: 14, g: 0.8, inBreak: true },
    pad: { g: 1.1, cutoff: 2200 },
    arp: { voice: 'pluck', pat: H8, g: 0.35, cutoff: 1800 },
    lead: { voice: 'bell', oct: 3, len: 8, rhythms: ['x.......x...x.......x.....x.....', 'x.....x.....x...x.....x.........', '..x.....x.....x.....x...x.......'] },
  },
  disco: {
    label: 'Nu-disco: funk bass, clav chops, brass hits',
    bpm: 120, scale: 'dorian', sevenths: true,
    progs: [[0, 3, 0, 3], [0, 2, 3, 4], [1, 4, 0, 0], [0, 3, 6, 0]],
    drums: { full: { kick: FOUR, clap: BACK, ohat: OFF, hat: H16 }, light: { hat: H16 } },
    bass: { voice: 'sawbass', pat: ['x.xx..x.x.xx..x.', 'x..x.xx.x..x.x.x', 'x.x..xx.x.x..x.x'], len: 1.2, notes: 'walk', cutoff: 1500 },
    chords: { voice: 'stab', pat: ['..x..x.x..x..x.x', 'x..x.x..x..x.x..', '.x.x..x..x.x..x.'], len: 0.8, g: 0.8, up: 12 },
    lead: { voice: 'brass', oct: 3, len: 2.5, rhythms: ['x.....x.x.......x.....x.x.x.....', '....x.x.x.......x...x.x.x.......', 'x..x..x.........x..x..x...x.x...'] },
  },
  guaracha: {
    label: 'Guaracha: offbeat bass, tribal congas, whistle riff',
    bpm: 120, scale: 'harmonic',
    progs: [[0, 0, 4, 4], [0, 3, 4, 0], [0, 5, 4, 4]],
    kit: { kick: { dec: 0.2, drive: 2.4 }, conga: { f: 290, dec: 0.09 }, tomlo: { f: 120, dec: 0.16, pan: -0.3 } },
    drums: { full: { kick: FOUR, conga: ['..xx.x..x.xx.x..', '.x.xx..x.x.xx..x'], tomlo: '......x.......x.', clap: BACK, shaker: H16 }, light: { conga: '..xx.x..x.xx.x..', shaker: H16 } },
    bass: { voice: 'sawbass', pat: [OFF, '..x..x....x..x..'], len: 1.5, cutoff: 1100 },
    lead: { voice: ['whistle', 'square'], oct: 3, len: 1.5, rhythms: ['x.x.x..x.x.x.x..x.x.x..x.xxx.x..', 'x..x.x.x..x.x...x..x.x.x.x.xx...', 'xx.x..x.xx.x..x.xx.x..x.x.x.xx..'] },
  },
  eurodance: {
    label: 'Eurodance: major key, offbeat bass, supersaw stabs',
    bpm: 150, scale: 'major',
    progs: [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 4, 5, 0]],
    drums: { full: { kick: FOUR, clap: BACK, ohat: OFF }, light: { ohat: '..o...o...o...o.' } },
    bass: { voice: 'sawbass', pat: [OFF, '..xx..xx..xx..xx'], len: 1.2, cutoff: 1200 },
    chords: { voice: 'supersaw', pat: ['x..x..x..x..x.x.', 'x.....x...x..x..'], len: 2, g: 0.7 },
    lead: { voice: 'pluck', oct: 4, len: 1.5, rhythms: ['x.xx.xx.x.xx.xx.x.xx.xx.x.xxxxx.', 'xx.xx.x.xx.xx.x.xx.xx.x.x.x.xxx.'] },
  },
  drill: {
    label: 'Drill: sliding 808s, 3-3-2 hats, dark piano',
    bpm: 150, scale: 'harmonic', leadScale: [0, 1, 2, 4, 5],
    progs: [[0, 0, 5, 4], [0, 5, 0, 4], [0, 0, 3, 4]],
    kit: { kick: { dec: 0.15, drive: 2 }, snare: { tone: 240, ndec: 0.11, hp: 2000 }, hat: { dec: 0.02 } },
    drums: { full: { kick: ['x......x..x.....', 'x.....x...x..x..'], snare: '........x.....o.', hat: ['x..x..x.x..x..x.', 'x..x..xrx..x..x.'] }, light: { hat: 'o..o..o.o..o..o.' } },
    bass: { voice: 'bass808', pat: '@kick', len: 5, drive: 2.8, glide: 0.5 },
    pad: { g: 0.4, cutoff: 900 },
    lead: { voice: 'piano', oct: 3, len: 2.5, g: 1.2, rhythms: ['x..x..x.x..x..x.x..x..x.x.x.x...', 'x.x..x..x.x..x..x.x..x..x..x.x..'] },
  },
  stomp: {
    label: 'Stomp and clap: arena drums, brass riff',
    bpm: 120, scale: 'minor',
    progs: [[0, 0, 5, 6], [0, 6, 5, 6], [0, 0, 3, 4]],
    kit: { clap: { rev: 0.6, g: 1.3 }, tomlo: { f: 95, dec: 0.2 } },
    drums: { full: { stomp: 'x.x.....x.x.....', clap: BACK }, light: { clap: '....o.......o...' }, fill: { tomlo: '..........x.x.xx' } },
    bass: { voice: 'sawbass', pat: 'x.......x.......', len: 7, cutoff: 500 },
    chords: { voice: 'supersaw', pat: 'x.x.....x.x.....', len: 1.2, g: 0.5 },
    lead: { voice: 'brass', oct: 2, len: 2.5, g: 1.2, rhythms: ['x.x.....x.x...x.x.x.....x.xx....', '....x.x.....x.x.....x.x...x.x.x.'] },
  },
  piano: {
    label: 'Cinematic piano: arpeggios, strings, slow heartbeat kick',
    bpm: 90, scale: 'minor',
    progs: [[0, 5, 2, 6], [5, 2, 6, 0], [0, 2, 5, 6], [3, 5, 0, 6]],
    kit: { kick: { dec: 0.35, drive: 1.5, g: 0.9 }, snare: { rev: 0.6, g: 0.6 } },
    drums: { full: { kick: 'x.........x.....', snare: '........x.......', shaker: H8Q }, light: {} },
    bass: { voice: 'sub', pat: 'x...............', len: 14, inBreak: true },
    pad: { g: 0.5, cutoff: 1600 },
    arp: { voice: 'piano', pat: H8, g: 0.9, len: 3 },
    lead: { voice: 'piano', oct: 4, len: 6, rhythms: ['x.......x.....x.x.......x...x...', '....x.......x.x.....x.......x...', 'x.....x.....x...x.....x...x.....'] },
  },
}

/* ---------- the arranger ---------- */

const DRUMS = {
  kick: [0, (mix, t, v, o) => V.kick(mix, t, { ...o, g: (o.g ?? 1) * v })],
  hkick: [0, (mix, t, v, o, chord) => V.hardkick(mix, t, { ...o, g: v, midi: chord.bass })],
  stomp: [0, (mix, t, v, o) => V.stomp(mix, t, { ...o, g: v })],
  snare: [1, (mix, t, v, o) => V.snare(mix, t, { ...o, g: (o.g ?? 1) * v })],
  clap: [1, (mix, t, v, o) => V.clap(mix, t, { ...o, g: (o.g ?? 1) * v })],
  rim: [1, (mix, t, v, o) => V.rim(mix, t, { ...o, g: v })],
  snap: [1, (mix, t, v, o) => V.snap(mix, t, { ...o, g: v })],
  hat: [1, (mix, t, v, o) => V.hat(mix, t, { ...o, g: (o.g ?? 1) * v })],
  ohat: [1, (mix, t, v, o) => V.hat(mix, t, { ...o, open: true, g: (o.g ?? 1) * v })],
  shaker: [1, (mix, t, v, o) => V.shaker(mix, t, { ...o, g: v })],
  conga: [1, (mix, t, v, o) => V.tom(mix, t, { f: 290, ...o, g: v })],
  tomlo: [1, (mix, t, v, o) => V.tom(mix, t, { f: 110, ...o, g: v })],
  clave: [1, (mix, t, v, o) => V.clave(mix, t, { ...o, g: v })],
}
const VEL = { x: 1, X: 1.2, o: 0.45, r: 0.8, t: 0.8 }

function seedOf(text) {
  let h = 2166136261
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h
}

/** Everything about a track that is decided once: chords, patterns, the melody. */
function compose(style, track) {
  const rng = mulberry32(seedOf(`${track.style}/${track.seed}`))
  const pick = (v) => v[Math.floor(rng() * v.length)]
  // Pattern alternates go by progression number, not by chance: two tracks of
  // one style then differ in groove as well as in key and melody.
  const alt = (v) => (Array.isArray(v) ? v[(track.prog ?? 0) % v.length] : v)
  const scale = SCALES[track.scale ?? style.scale]
  const root = 36 + (((track.key ?? 9) % 12) + 12) % 12
  const degree = (d) => root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7)
  const fold = (m, lo) => lo + ((((m - lo) % 12) + 12) % 12)

  const prog = style.progs[(track.prog ?? 0) % style.progs.length]
  const chords = prog.map((d) => ({
    bass: fold(degree(d), 36),
    notes: [0, 2, 4, ...(style.sevenths ? [6] : [])].map((k) => fold(degree(d + k), 55)),
  }))

  const pats = {}
  for (const set of ['full', 'light', 'fill']) {
    pats[set] = {}
    for (const [voice, pat] of Object.entries(style.drums[set] ?? {})) pats[set][voice] = alt(pat)
  }
  const layer = (spec) => spec && { ...spec, pat: alt(spec.pat), voice: alt(spec.voice) }
  const bass = layer(style.bass)
  if (bass?.pat === '@kick') bass.pat = pats.full.kick.replace(/[^.]/g, 'x')
  // A walking bass keeps one set of offsets from the root, so every bar repeats it.
  if (bass) bass.offsets = [...bass.pat].map(() => (bass.notes === 'walk' ? pick([0, 0, 0, 12, 7, 10, 12]) : 0))
  if (bass) bass.glides = [...bass.pat].map((_, i) => (i && rng() < (bass.glide ?? 0) ? pick([12, 12, -5, 7]) : 0))

  // The melody: a two-bar rhythm, pitched by a short random walk over the
  // melody scale, then answered by a copy that lands on the tonic.
  const lead = layer(style.lead)
  const ls = style.leadScale ?? PENT[track.scale ?? style.scale]
  const [lo, hi] = lead.range ?? [-2, ls.length + 2]
  const hits = [...alt(lead.rhythms)].flatMap((c, step) => (c === '.' ? [] : [{ step, accent: c === 'X' }]))
  let n = pick([0, 1, 2, 3])
  const call = hits.map((h, k) => {
    if (k) n = Math.max(lo, Math.min(hi, n + pick([-2, -1, -1, 0, 1, 1, 2])))
    return { ...h, n }
  })
  const answer = call.map((h) => ({ ...h }))
  answer.at(-1).n = pick([0, 0, ls.length])
  if (answer.length > 2) answer.at(-2).n = answer.at(-1).n + pick([1, -1, 2])
  const pitch = (k) => root + 12 * lead.oct + scale[ls[((k % ls.length) + ls.length) % ls.length]] + 12 * Math.floor(k / ls.length)
  lead.phrases = [call, answer].map((phrase) =>
    phrase.map((h, k) => ({ ...h, midi: pitch(h.n), steps: Math.min(lead.len, (phrase[k + 1]?.step ?? 32) - h.step) })),
  )

  return { chords, pats, bass, lead, chordLayer: layer(style.chords), arp: layer(style.arp), pad: style.pad, root }
}

// How loud each layer plays in each part of a composition's arrangement. The
// melody sits well above the bass: on a phone speaker it is most of what is heard.
const PARTS = {
  intro: { drums: 'light', drumGain: 0.7, bass: 0, chords: 1, lead: 1.1, bright: 0.5 },
  break: { drums: 'light', drumGain: 1, bass: 0, chords: 1.25, lead: 1.3, bright: 1 },
  build: { drums: 'build', drumGain: 1, bass: 0, chords: 1, lead: 0.9, bright: 0.5 },
  drop: { drums: 'full', drumGain: 1, bass: 0.85, chords: 1.25, lead: 1.6, bright: 1 },
  drive: { drums: 'full', drumGain: 1, bass: 0.85, chords: 0.9, lead: 1.6, bright: 1 },
}

const tone = (voice) => (mix, t, dur, midi, o) => V[voice](mix, t, dur, midi, o)

/**
 * Queues a track's music for a composition's sections. `queue` takes
 * [pass, run] pairs: pass 0 runs first, so kicks write the sidechain envelope
 * before the voices that duck under it are mixed.
 */
export function arrangeTrack(mix, track, sections, queue, authoredBpm = 120) {
  const style = STYLES[track.style]
  if (!style) throw new Error(`unknown soundtrack style ${track.style}`)
  const song = compose(style, track)
  const beat = 60 / style.bpm
  const step = beat / 4
  const bar = beat * 4
  const kit = style.kit ?? {}
  const hold = style.hold ?? 1

  for (const sec of sections) {
    const length = sec.bars * 4 * (60 / authoredBpm)
    const end = sec.at + length
    const add = (pass, t, run) => {
      if (t < end - 0.002) queue.push([pass, run])
    }

    if (sec.part === 'outro') {
      const { notes, bass } = song.chords.find((c) => c.bass === song.root) ?? song.chords[0]
      add(0, sec.at, () => V.kick(mix, sec.at, { f: 34, sweep: 70, sweepT: 0.08, dec: 0.8, drive: 1.6, duck: 0.9, rel: 0.4 }))
      add(1, sec.at, () => V.pad(mix, sec.at, length, notes, { g: 1.2, cutoff: 1400 }))
      add(1, sec.at, () => V.sub(mix, sec.at, length * 0.45, bass, { g: 1.1 }))
      add(1, sec.at, () => tone(song.lead.voice)(mix, sec.at, beat * 2, song.lead.phrases[1].at(-1).midi, { g: 0.9 }))
      continue
    }

    const part = PARTS[sec.part]
    if (!part) throw new Error(`unknown music part ${sec.part}`)
    const nBars = Math.ceil(length / bar - 1e-6)
    for (let b = 0; b < nBars; b++) {
      const t0 = sec.at + b * bar
      const span = Math.min(bar, end - t0)
      const progress = nBars > 1 ? b / (nBars - 1) : 1
      const chord = song.chords[Math.floor(b / hold) % song.chords.length]
      const T = (i) => t0 + i * step + (i % 2 ? (style.swing ?? 0) * step : 0)

      /* drums */
      if (part.drums === 'build') {
        for (let q = 0; q < 4; q++) add(0, t0 + q * beat, () => V.kick(mix, t0 + q * beat, { ...kit.kick, g: (kit.kick?.g ?? 1) * (0.6 + 0.4 * progress) }))
        for (let e = 0; e < 4; e++) add(1, t0 + e * beat + beat / 2, () => V.hat(mix, t0 + e * beat + beat / 2, { g: 0.5 + progress * 0.5 }))
      } else {
        const set = b % 4 === 3 ? { ...song.pats[part.drums], ...(part.drums === 'full' ? song.pats.fill : {}) } : song.pats[part.drums]
        for (const [voice, pat] of Object.entries(set)) {
          const [pass, hit] = DRUMS[voice]
          for (let i = 0; i < 16; i++) {
            const c = pat[i]
            if (c === '.') continue
            const strokes = c === 'r' ? [0, 0.5] : c === 't' ? [0, 1 / 3, 2 / 3] : [0]
            for (const k of strokes) {
              const t = T(i) + k * step
              add(pass, t, () => hit(mix, t, VEL[c] * part.drumGain, kit[voice] ?? {}, chord))
            }
          }
        }
      }

      /* bass */
      const bassOn = song.bass && (part.bass || (song.bass.inBreak && sec.part !== 'build'))
      if (bassOn) {
        const { pat, len, offsets, glides, voice, g = 1, ...o } = song.bass
        ;[...pat].forEach((c, i) => {
          if (c === '.') return
          const note = chord.bass + (song.bass.notes === 'octave' ? (i % 4 === 2 ? 12 : 0) : offsets[i])
          add(1, T(i), () => V[voice](mix, T(i), Math.min(len * step, end - T(i)), note, { ...o, g: g * (part.bass || 0.7), glide: glides[i] }))
        })
      }

      /* harmony */
      const cutoff = (max) => (sec.part === 'build' ? max * (0.4 + 0.6 * progress) : max * (0.5 + 0.5 * part.bright))
      const on = (layer) => layer && (!layer.only || layer.only.includes(sec.part))
      if (on(song.pad)) add(1, t0, () => V.pad(mix, t0, span, chord.notes, { g: song.pad.g * part.chords, cutoff: cutoff(song.pad.cutoff) }))
      if (on(song.chordLayer)) {
        const { pat, len, voice, g = 1, up = 0, drive = 0.7 } = song.chordLayer
        const level = g * (sec.part === 'drive' ? drive : part.chords)
        ;[...pat].forEach((c, i) => {
          if (c === '.') return
          chord.notes.forEach((m, k) => add(1, T(i), () => tone(voice)(mix, T(i), Math.min(len * step, end - T(i)), m + up, { g: level, pan: k * 0.3 - 0.4 })))
        })
      }
      if (on(song.arp)) {
        const { pat, voice, g = 1, len = 1, ...o } = song.arp
        const seq = [0, 1, 2, 1, 2, 0, 1, 2]
        let k = 0
        ;[...pat].forEach((c, i) => {
          if (c === '.') return
          const m = chord.notes[seq[k % seq.length] % chord.notes.length] + 12 * (k % 8 >= 4 ? 1 : 0)
          const pan = k++ % 2 ? 0.35 : -0.35
          add(1, T(i), () => tone(voice)(mix, T(i), len * step, m, { ...o, g: g * part.chords, pan }))
        })
      }

      /* melody: bars alternate call, call, answer, answer; each phrase spans two */
      const phrase = song.lead.phrases[Math.floor(b / 2) % 2]
      const { voice, g = 1, duty } = song.lead
      for (const h of phrase) {
        if (Math.floor(h.step / 16) !== b % 2) continue
        const t = T(h.step % 16)
        add(1, t, () => tone(voice)(mix, t, Math.min(h.steps * step, end - t), h.midi, { g: g * part.lead * (h.accent ? 1.15 : 1), accent: h.accent, ...(duty ? { duty } : {}) }))
      }

      if (style.vinyl) add(1, t0, () => V.vinyl(mix, t0, span))
    }

    // A build ends on a snare roll that doubles into whatever comes next.
    if (sec.part === 'build') {
      for (let s = 0; s < 8; s++) {
        const t = end - 2 * beat + s * (beat / 4)
        if (t >= sec.at) queue.push([1, () => V.clap(mix, t, { g: 0.4 + s * 0.08 })])
      }
    }
  }
  return { beat }
}

/**
 * Master tone for a track: these mixes are written bass-first, and a phone
 * speaker plays almost nothing under 150 Hz. Run it once everything is mixed
 * and before `mix.finish()`: 5 dB off the sub, 4 dB onto the top.
 */
export function masterTrack(mix) {
  const low = Math.exp((-TAU * 120) / SR)
  const high = Math.exp((-TAU * 3000) / SR)
  for (const bus of [mix.L, mix.R, mix.revL, mix.revR, mix.dlyL, mix.dlyR]) {
    let a = 0
    let b = 0
    for (let k = 0; k < bus.length; k++) {
      const x = bus[k]
      a = x + (a - x) * low
      b = x + (b - x) * high
      bus[k] = x - 0.44 * a + 0.58 * (x - b)
    }
  }
}

/** One line describing a track, for logs and the per-video notes. */
export function describeTrack(track) {
  const style = STYLES[track.style]
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const scale = track.scale ?? style.scale
  return `${track.style} · ${style.bpm} BPM · ${names[(((track.key ?? 9) % 12) + 12) % 12]} ${scale} · progression ${(track.prog ?? 0) % style.progs.length + 1}`
}
