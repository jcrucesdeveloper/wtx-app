// Voice-over helpers for the daily reels.
//
//   node scripts/voice.mjs phrases <file>
//       Prints when each spoken phrase starts/ends (silence detection), plus
//       total length — use it to time captions to the words.
//
//   node scripts/voice.mjs draft "<script>" <out.wav> [--voice "Microsoft Zira Desktop"] [--rate 0]
//       Windows-only placeholder narration (built-in speech synthesis). It
//       sounds robotic: use it to lock timing, then swap in a real recording
//       (phone voice memo is fine — any format ffmpeg reads) or post the
//       SFX-only cut and add the platform's own text-to-speech in-app.
//
// Paths are relative to listing/videos/ (voice files live in assets/voice/).

import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import { VIDEOS_DIR } from './paths.mjs'

const [cmd, ...args] = process.argv.slice(2)

function flag(name, fallback) {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args[i + 1]
}

if (cmd === 'phrases') {
  const file = resolve(VIDEOS_DIR, args[0])
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'], { encoding: 'utf8' })
  const dur = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)
  const total = dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : NaN
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1])
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1])
  // Speech = the gaps between silences.
  const phrases = []
  let cursor = starts[0] === 0 || (starts[0] !== undefined && starts[0] < 0.05) ? ends.shift() : 0
  if (starts[0] !== undefined && starts[0] < 0.05) starts.shift()
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] - cursor > 0.15) phrases.push([cursor, starts[i]])
    cursor = ends[i] ?? total
  }
  if (total - cursor > 0.15) phrases.push([cursor, total])
  console.log(`total ${total.toFixed(2)} s, ${phrases.length} phrase(s):`)
  phrases.forEach(([a, b], i) => console.log(`  ${i + 1}. ${a.toFixed(2)} → ${b.toFixed(2)} s`))
} else if (cmd === 'draft') {
  if (process.platform !== 'win32') throw new Error('draft voice uses Windows speech synthesis; record the voice-over instead')
  const [text, out] = args
  const voice = flag('--voice', 'Microsoft Zira Desktop')
  const rate = flag('--rate', '1')
  const target = resolve(VIDEOS_DIR, out)
  mkdirSync(dirname(target), { recursive: true })
  const ps = [
    'Add-Type -AssemblyName System.Speech',
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    `$s.SelectVoice('${voice.replace(/'/g, "''")}')`,
    `$s.Rate = ${Number(rate)}`,
    `$s.SetOutputToWaveFile('${target.replace(/'/g, "''")}')`,
    `$s.Speak('${text.replace(/'/g, "''")}')`,
    '$s.Dispose()',
  ].join('; ')
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr)
  console.log(`draft voice → ${join(out)}`)
} else {
  console.error('usage: node scripts/voice.mjs phrases <file> | draft "<script>" <out.wav>')
  process.exit(1)
}
