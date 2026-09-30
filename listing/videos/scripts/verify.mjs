// Checks every delivered file against the platform spec it is meant for
// (listing/research/06-video-specs.md). Exits non-zero on any failure.
//
// Usage: node scripts/verify.mjs

import { spawnSync } from 'node:child_process'
import { openSync, readSync, closeSync } from 'node:fs'
import { join } from 'node:path'
import ffprobe from 'ffprobe-static'
import ffmpeg from 'ffmpeg-static'
import { OUT_DIR } from './paths.mjs'
import { TARGETS } from './targets.mjs'

const RULES = {
  youtube: { w: 1920, h: 1080, fpsMax: 60, minDur: 1, maxDur: 600, level: 42, minMbps: 8, audioKbps: [256, 400], lufs: -14 },
  appstore: { w: 886, h: 1920, fpsMax: 30, minDur: 15, maxDur: 30, level: 40, minMbps: 10, maxMbps: 12.2, audioKbps: [240, 264], lufs: -16, maxMB: 500 },
  social: { w: 1080, h: 1920, fpsMax: 60, minDur: 3, maxDur: 180, level: 42, minMbps: 6, audioKbps: [128, 330], lufs: -14, maxMB: 287 },
}

function probe(file) {
  const r = spawnSync(ffprobe.path, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' })
  return JSON.parse(r.stdout)
}

function loudness(file) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' })
  const i = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g)
  const tp = r.stderr.match(/Peak:\s+(-?[\d.]+) dBFS/g)
  return { i: parseFloat(i.at(-1).split(/\s+/)[1]), tp: parseFloat(tp.at(-1).split(/\s+/)[1]) }
}

/** `moov` before `mdat` = fast start (plays/processes before fully downloaded). */
function fastStart(file) {
  const fd = openSync(file, 'r')
  const head = Buffer.alloc(64 * 1024)
  readSync(fd, head, 0, head.length, 0)
  closeSync(fd)
  const moov = head.indexOf('moov')
  const mdat = head.indexOf('mdat')
  return moov !== -1 && (mdat === -1 || moov < mdat)
}

let failures = 0
const rows = []
for (const targets of Object.values(TARGETS)) {
  for (const target of targets) {
    const file = join(OUT_DIR, target.out)
    const rule = RULES[target.preset]
    const info = probe(file)
    const v = info.streams.find((s) => s.codec_type === 'video')
    const a = info.streams.find((s) => s.codec_type === 'audio')
    const [n, d] = v.avg_frame_rate.split('/').map(Number)
    const fps = n / d
    const dur = parseFloat(info.format.duration)
    const mbps = parseInt(v.bit_rate) / 1e6
    const mb = parseInt(info.format.size) / 1e6
    const loud = loudness(file)
    const checks = [
      ['h264 High', v.codec_name === 'h264' && v.profile === 'High'],
      [`level ≤ ${rule.level / 10}`, v.level <= rule.level],
      [`${rule.w}×${rule.h}`, v.width === rule.w && v.height === rule.h],
      ['yuv420p bt709', v.pix_fmt === 'yuv420p' && v.color_primaries === 'bt709'],
      [`fps ≤ ${rule.fpsMax}`, fps <= rule.fpsMax + 0.01],
      [`${rule.minDur}–${rule.maxDur}s`, dur >= rule.minDur && dur <= rule.maxDur + 0.05],
      [`≥${rule.minMbps}${rule.maxMbps ? '–' + rule.maxMbps : ''} Mbps`, mbps >= rule.minMbps && (!rule.maxMbps || mbps <= rule.maxMbps)],
      ['AAC stereo 48k', a && a.codec_name === 'aac' && a.channels === 2 && a.sample_rate === '48000'],
      [`audio ${rule.audioKbps.join('–')}k`, a && parseInt(a.bit_rate) / 1000 >= rule.audioKbps[0] && parseInt(a.bit_rate) / 1000 <= rule.audioKbps[1]],
      [`${rule.lufs} LUFS ±1`, Math.abs(loud.i - rule.lufs) <= 1],
      ['true peak ≤ -1 dB', loud.tp <= -1],
      ['faststart', fastStart(file)],
      ...(rule.maxMB ? [[`< ${rule.maxMB} MB`, mb < rule.maxMB]] : []),
    ]
    const bad = checks.filter(([, ok]) => !ok)
    failures += bad.length
    rows.push(
      `${bad.length ? '✗' : '✓'} ${target.out}\n    ${v.width}×${v.height} ${fps.toFixed(2)}fps ${dur.toFixed(2)}s ` +
        `${v.profile}@L${v.level / 10} ${mbps.toFixed(1)}Mbps · ${a.codec_name} ${a.channels}ch ${a.sample_rate}Hz ` +
        `${Math.round(a.bit_rate / 1000)}k · ${loud.i} LUFS, TP ${loud.tp} dB · ${mb.toFixed(1)} MB` +
        (bad.length ? `\n    FAILED: ${bad.map(([name]) => name).join(', ')}` : ''),
    )
  }
}
console.log(rows.join('\n'))
console.log(failures ? `\n${failures} check(s) failed` : '\nAll deliverables match their platform specs.')
process.exit(failures ? 1 : 0)
