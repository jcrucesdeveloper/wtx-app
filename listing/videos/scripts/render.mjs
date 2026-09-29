// Renders a composition (compositions/<name>.html) to finished, platform-ready
// video files.
//
//   1. Parallel headless-Chrome workers seek the composition frame by frame and
//      stream PNG frames into lossless RGB segments.
//   2. Segments are joined into one master; the composition's audio cues are
//      synthesized into a WAV (scripts/music.mjs).
//   3. The master + audio are encoded once per delivery preset
//      (scripts/targets.mjs), with loudness normalized per platform.
//
// Usage:
//   node scripts/render.mjs <composition> [...more]    render + deliver
//   node scripts/render.mjs <composition> --still 90 --out file.png
//   node scripts/render.mjs <composition> --sheet       contact sheet of the master
//   options: --workers N   --no-deliver   --frames A:B (partial master, for drafts)

import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize, dirname } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { cpus } from 'node:os'
import puppeteer from 'puppeteer-core'
import ffmpeg from 'ffmpeg-static'
import { CHROME, VIDEOS_DIR, BUILD_DIR, OUT_DIR } from './paths.mjs'
import { renderAudio } from './music.mjs'
import { TARGETS, PRESETS } from './targets.mjs'

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function serve() {
  const server = createServer((req, res) => {
    const path = normalize(join(VIDEOS_DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
    if (!path.startsWith(VIDEOS_DIR) || !existsSync(path) || statSync(path).isDirectory()) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'max-age=3600' })
    createReadStream(path).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

function run(args, opts = {}) {
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit', ...opts })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`)
}

async function openComp(browser, url, comp) {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('[page]', e.message))
  if (comp) await page.setViewport({ width: comp.width, height: comp.height, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction('window.__ready === true', { timeout: 120000 })
  return page
}

async function launch() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
  })
}

async function capture(cdp) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })
  return Buffer.from(data, 'base64')
}

async function renderSegment(url, comp, from, to, file, progress) {
  const browser = await launch()
  try {
    const page = await openComp(browser, url, comp)
    const cdp = await page.createCDPSession()
    const enc = spawn(ffmpeg, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(comp.fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-crf', '0', file,
    ], { stdio: ['pipe', 'inherit', 'inherit'] })
    const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error('encoder exited ' + c)))))
    for (let f = from; f < to; f++) {
      await page.evaluate((f) => window.__seek(f), f)
      const png = await capture(cdp)
      if (!enc.stdin.write(png)) await new Promise((r) => enc.stdin.once('drain', r))
      progress()
    }
    enc.stdin.end()
    await done
  } finally {
    await browser.close()
  }
}

function parseArgs(argv) {
  const opts = { names: [], workers: Math.max(1, Math.min(6, Math.floor(cpus().length / 2))), deliver: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--workers') opts.workers = +argv[++i]
    else if (a === '--still') opts.still = argv[++i].split(',').map(Number)
    else if (a === '--out') opts.out = argv[++i]
    else if (a === '--sheet') opts.sheet = true
    else if (a === '--no-deliver') opts.deliver = false
    else if (a === '--frames') opts.frames = argv[++i].split(':').map(Number)
    else opts.names.push(a)
  }
  return opts
}

async function renderComposition(server, name, opts) {
  const port = server.address().port
  const url = `http://127.0.0.1:${port}/compositions/${name}.html`
  const workDir = join(BUILD_DIR, 'render', name)
  mkdirSync(workDir, { recursive: true })

  const probeBrowser = await launch()
  let comp
  try {
    const probe = await openComp(probeBrowser, url)
    comp = await probe.evaluate(() => window.__comp)
    if (opts.still !== undefined) {
      // One frame → --out (or build/…/still-N.png); several → a review sheet.
      await probe.setViewport({ width: comp.width, height: comp.height, deviceScaleFactor: 1 })
      const cdp = await probe.createCDPSession()
      const files = []
      for (const f of opts.still) {
        await probe.evaluate((f) => window.__seek(f), f)
        const out = opts.still.length === 1 && opts.out ? opts.out : join(workDir, `still-${f}.png`)
        mkdirSync(dirname(out), { recursive: true })
        writeFileSync(out, await capture(cdp))
        files.push(out)
      }
      if (files.length > 1) {
        const cols = comp.width > comp.height ? 3 : 6
        const w = comp.width > comp.height ? 640 : 300
        const inputs = files.flatMap((f) => ['-i', f])
        const scaled = files.map((_, i) => `[${i}:v]scale=${w}:-1[s${i}]`).join(';')
        const grid = files.map((_, i) => `[s${i}]`).join('')
        const layout = files.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => `w0`).join('+') : 0}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => `h0`).join('+') : 0}`).join('|')
        const out = opts.out ?? join(workDir, 'stills.png')
        run([...inputs, '-filter_complex', `${scaled};${grid}xstack=inputs=${files.length}:layout=${layout}:fill=black`, out])
        console.log(`${name}: ${files.length} stills → ${out}`)
      } else console.log(`${name}: still → ${files[0]}`)
      return
    }
  } finally {
    await probeBrowser.close()
  }

  const master = join(workDir, 'master.mkv')
  if (!opts.sheet) {
    const [start, end] = opts.frames ?? [0, comp.frames]
    const total = end - start
    const n = Math.min(opts.workers, Math.ceil(total / 30))
    const chunk = Math.ceil(total / n)
    let doneFrames = 0
    const t0 = Date.now()
    const tick = () => {
      doneFrames++
      if (doneFrames % 30 === 0 || doneFrames === total) {
        const fps = doneFrames / ((Date.now() - t0) / 1000)
        process.stdout.write(`\r${name}: ${doneFrames}/${total} frames (${fps.toFixed(1)} fps, ${n} workers)   `)
      }
    }
    const segs = []
    const jobs = []
    for (let k = 0; k < n; k++) {
      const a = start + k * chunk
      const b = Math.min(end, a + chunk)
      if (a >= b) continue
      const file = join(workDir, `seg-${String(k).padStart(2, '0')}.mkv`)
      segs.push(file)
      jobs.push(renderSegment(url, comp, a, b, file, tick))
    }
    await Promise.all(jobs)
    process.stdout.write('\n')
    writeFileSync(join(workDir, 'segments.txt'), segs.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n') + '\n')
    run(['-f', 'concat', '-safe', '0', '-i', join(workDir, 'segments.txt'), '-c', 'copy', master])
    segs.forEach((s) => rmSync(s))

    const wav = join(workDir, 'audio.wav')
    const music = join(workDir, 'audio-sfx-only.wav')
    renderAudio(comp.audio, comp.duration, wav)
    renderAudio(comp.audio, comp.duration, music, { music: false })
    writeFileSync(join(workDir, 'comp.json'), JSON.stringify(comp, null, 2))
    console.log(`${name}: master ${comp.width}x${comp.height} @${comp.fps} ${comp.duration}s`)
  }

  if (opts.sheet) {
    const cols = comp.width > comp.height ? 6 : 10
    const w = comp.width > comp.height ? 320 : 180
    run(['-i', master, '-vf', `fps=2,scale=${w}:-1,tile=${cols}x${Math.ceil((comp.duration * 2) / cols)}`, '-frames:v', '1', join(workDir, 'sheet.png')])
    console.log(`${name}: contact sheet → ${join(workDir, 'sheet.png')}`)
    return
  }

  if (opts.deliver && !opts.frames) deliver(name, workDir, comp)
}

/**
 * Two-pass EBU R128 normalization: measure first, then apply as one linear
 * gain (single-pass loudnorm is dynamic and audibly pumps music).
 */
function loudnormFilter(wav, lufs) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', wav, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' })
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1))
  return (
    `loudnorm=I=${lufs}:TP=-1.5:LRA=11:linear=true:measured_I=${m.input_i}:measured_TP=${m.input_tp}` +
    `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset},aresample=48000`
  )
}

/** Encodes the master once per delivery target, loudness-normalized per platform. */
export function deliver(name, workDir, comp) {
  for (const target of TARGETS[name] ?? []) {
    const preset = PRESETS[target.preset]
    const out = join(OUT_DIR, target.out)
    mkdirSync(dirname(out), { recursive: true })
    const audio = join(workDir, target.music === false ? 'audio-sfx-only.wav' : 'audio.wav')
    const vf = [`scale=${preset.width ?? comp.width}:${preset.height ?? comp.height}:flags=lanczos`, 'format=yuv420p']
    run([
      '-i', join(workDir, 'master.mkv'),
      '-i', audio,
      '-map', '0:v:0', '-map', '1:a:0',
      '-vf', vf.join(','),
      '-r', String(comp.fps),
      ...preset.video,
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-af', loudnormFilter(audio, preset.lufs),
      '-c:a', 'aac', '-b:a', preset.audioBitrate, '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart',
      '-t', String(comp.duration),
      out,
    ])
    console.log(`  → ${target.out}  (${(statSync(out).size / 1e6).toFixed(1)} MB, ${target.preset})`)
  }
}

const opts = parseArgs(process.argv.slice(2))
if (!opts.names.length) {
  console.error('usage: node scripts/render.mjs <composition> [...]')
  process.exit(1)
}
const server = await serve()
try {
  for (const name of opts.names) await renderComposition(server, name, opts)
} finally {
  server.close()
}
