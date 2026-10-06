/* The stage the Three.js loops in this folder share: the 1080×1920 canvas,
   the look (colours, text slabs, the address pill), the 3D props (phones,
   cards, plates) and the Play / Record controls.

   A loop is one HTML file that calls Reel.run() with its copy and a build()
   that returns what happens at each moment. Everything is a function of the
   time in the loop, so the last frame runs into the first.

   This is a classic script, not a module, so the loops still open straight
   from disk; three.js itself is passed in by the page. */
;(() => {
  const W = 1080
  const H = 1920
  const FPS = 30
  const TAU = Math.PI * 2

  const YELLOW = '#ffe100'
  const BLUE = '#2747ff'
  const RED = '#f0283c'
  const LIME = '#b6ff2e'
  const GREEN = '#19d36b'
  const INK = '#0b0b10'
  const WHITE = '#ffffff'
  const DISPLAY = '"Segoe UI Black", "Arial Black", "Helvetica Neue", Arial, sans-serif'
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
  const MONO = '"Cascadia Code", "SF Mono", Consolas, Menlo, monospace'

  const clamp01 = (x) => Math.min(1, Math.max(0, x))
  const seg = (t, a, b) => clamp01((t - a) / (b - a))
  const lerp = (a, b, k) => a + (b - a) * k
  const outCubic = (x) => 1 - (1 - x) ** 3
  const inCubic = (x) => x ** 3
  const inOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
  const outBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2
  /** 0 → 1 with a small overshoot, starting at `at`. */
  const pop = (t, at, dur = 0.22) => outBack(seg(t, at, at + dur))
  /** A knock that rings and dies away, starting at `t0`. */
  const pulse = (t, t0, amp, freq = 28, decay = 9) =>
    t < t0 ? 0 : amp * Math.exp(-decay * (t - t0)) * Math.sin(freq * (t - t0))
  /** The same "random" number every time for the same index. */
  const rand = (i, k = 0) => {
    const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
    return x - Math.floor(x)
  }
  /** A line of text on the standard dark slab. */
  const dark = (t) => ({ t, bg: INK, fg: WHITE })
  /** A line of text on a coloured slab. */
  const tint = (t, bg, fg = INK) => ({ t, bg, fg })

  const CSS = `
    * { box-sizing: border-box; margin: 0; }
    body { min-height: 100vh; display: grid; place-items: center; background: #0c1116; color: #f6f8fa;
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    main { display: grid; gap: 10px; padding: 12px; }
    .stage { position: relative; height: calc(100vh - 110px); min-height: 320px; aspect-ratio: 9 / 16; margin: 0 auto; }
    #out { width: 100%; height: 100%; display: block; border-radius: 10px; }
    /* What the TikTok / Reels interface covers. A guide only: not recorded. */
    #safe { position: absolute; inset: 0; display: none; pointer-events: none; border-style: solid;
      border-color: rgba(0, 0, 0, 0.45); border-width: 7% 11% 19% 0; border-radius: 10px; }
    #safe.on { display: block; }
    .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; }
    button { font: inherit; font-weight: 600; color: inherit; background: #1a222b;
      border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 8px; padding: 7px 12px; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: default; }
    #rec { background: #e0263a; border-color: #e0263a; }
    input[type='range'] { width: 180px; }
    #status { min-width: 150px; color: #aebac6; font-variant-numeric: tabular-nums; }`

  const HTML = `
    <main>
      <div class="stage"><canvas id="out" width="${W}" height="${H}"></canvas><div id="safe"></div></div>
      <div class="bar">
        <button id="rec">● Record</button>
        <button id="play">Pause</button>
        <input id="scrub" type="range" min="0" value="0" />
        <button id="lang"></button>
        <button id="guides">Safe zones</button>
        <span id="status"></span>
      </div>
    </main>`

  /**
   * Start a loop.
   *   slug      names the recording: wtx-<slug>-<lang>.webm
   *   duration  seconds in one loop
   *   from      where in the loop the video starts, in seconds (default 0)
   *   copy      { en, es }: the words, handed to build() as api.L
   *   build     (api) => { pose(t), over?(t), texts, wipes?, shakes?, cta? }
   *
   * texts   [{ at, until, lines }]. A block with `at` below 0 is already in place on frame 1.
   * wipes   [{ at, color, from: [x, y] }]: a circle of colour growing from a point.
   * shakes  [[at, pixels]].
   * cta     [at, until]: when the address pill steps forward.
   */
  function run({ THREE, RoomEnvironment, slug, duration, from = 0, copy, build }) {
    const FRAMES = Math.round(FPS * duration)
    const START = Math.round(from * FPS)
    const params = new URLSearchParams(location.search)
    const lang = params.get('lang') === 'es' ? 'es' : 'en'
    const loops = Math.max(1, Math.min(6, Number(params.get('loops')) || 1))

    document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }))
    document.body.insertAdjacentHTML('afterbegin', HTML)
    const $ = (id) => document.getElementById(id)
    const out = $('out')
    const ctx = out.getContext('2d')

    /* ---- The 3D scene ---------------------------------------------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H, false)
    const scene = new THREE.Scene()
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 6, 8)
    scene.add(key)
    /* fov 30 at 14 units: the frame is 7.5 units tall and 4.22 wide at z = 0,
       so one unit is 256 px there. */
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100)

    const makeCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })
    const textureOf = (canvas) => {
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      return tex
    }

    /** A flat slab with rounded corners, centred on the origin. */
    function slab(w, h, r, depth) {
      const x = -w / 2
      const y = -h / 2
      const s = new THREE.Shape()
      s.moveTo(x + r, y)
      s.lineTo(x + w - r, y)
      s.quadraticCurveTo(x + w, y, x + w, y + r)
      s.lineTo(x + w, y + h - r)
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      s.lineTo(x + r, y + h)
      s.quadraticCurveTo(x, y + h, x, y + h - r)
      s.lineTo(x, y + r)
      s.quadraticCurveTo(x, y, x + r, y)
      const g = new THREE.ExtrudeGeometry(s, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3,
        curveSegments: 12,
      })
      g.center()
      return g
    }
    const faceZ = (depth) => depth / 2 + 0.023

    /** A picture on a flat plane, drawn once by `draw(ctx, w, h)` at 400 px per unit. */
    function face(w, h, draw) {
      const canvas = makeCanvas(Math.round(w * 400), Math.round(h * 400))
      draw(canvas.getContext('2d'), canvas.width, canvas.height)
      return new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: textureOf(canvas), transparent: true }),
      )
    }

    const phoneBody = slab(1.4, 2.9, 0.2, 0.1)
    const phoneMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.3, metalness: 0.7 })
    /** A phone. `paint(key, draw)` redraws its 512×1112 screen only when `key` changes. */
    function phone() {
      const group = new THREE.Group()
      group.add(new THREE.Mesh(phoneBody, phoneMat))
      const canvas = makeCanvas(512, 1112)
      const tex = textureOf(canvas)
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.28, 2.78),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
      )
      screen.position.z = faceZ(0.1)
      group.add(screen)
      scene.add(group)
      let shown
      return {
        group,
        paint(key, draw) {
          if (key === shown) return
          shown = key
          const c = canvas.getContext('2d')
          c.save()
          c.clearRect(0, 0, 512, 1112)
          c.beginPath()
          c.roundRect(0, 0, 512, 1112, 60)
          c.clip()
          draw(c, 512, 1112)
          c.restore()
          tex.needsUpdate = true
        },
      }
    }

    /** A chunky card with a picture on the front. */
    function card(w, h, color, draw) {
      const group = new THREE.Group()
      group.add(new THREE.Mesh(slab(w, h, Math.min(w, h) * 0.14, 0.08), new THREE.MeshStandardMaterial({ color, roughness: 0.35 })))
      if (draw) {
        const front = face(w, h, draw)
        front.position.z = faceZ(0.08)
        group.add(front)
      }
      scene.add(group)
      return group
    }

    const steel = new THREE.MeshStandardMaterial({ color: 0xe4e8ef, roughness: 0.22, metalness: 1 })
    /** A weight plate, lying along the x axis like on a bar. */
    function plate(color, r) {
      const along = (mesh) => {
        mesh.rotation.z = Math.PI / 2
        return mesh
      }
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.1 })
      const inner = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0 })
      inner.color.multiplyScalar(0.72)
      const group = new THREE.Group()
      group.add(along(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.13, 56), mat)))
      group.add(along(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.14, 56), inner)))
      group.add(along(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 32), steel)))
      return group
    }

    /** An emoji that always faces the camera. */
    function emoji(char, size = 0.6) {
      const canvas = makeCanvas(160, 160)
      const c = canvas.getContext('2d')
      c.font = '120px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(char, 80, 88)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureOf(canvas), transparent: true }))
      sprite.scale.setScalar(size)
      sprite.userData.size = size
      scene.add(sprite)
      return sprite
    }

    /** Small coloured bits that burst from a point at `at` and fall. Returns its pose function. */
    function confetti(count, at, origin, spread = 6) {
      const geo = new THREE.BoxGeometry(1, 1, 0.35)
      const mats = [YELLOW, WHITE, BLUE, LIME, INK].map((c) => new THREE.MeshBasicMaterial({ color: c }))
      const bits = Array.from({ length: count }, (_, i) => {
        const mesh = new THREE.Mesh(geo, mats[i % mats.length])
        scene.add(mesh)
        return mesh
      })
      return (t) =>
        bits.forEach((bit, i) => {
          const a = t - at
          bit.visible = a > 0 && a < 1.3
          if (!bit.visible) return
          bit.position.set(
            origin[0] + (rand(i, 7) - 0.5) * spread * a,
            origin[1] + (2 + 5 * rand(i, 8)) * a - 5.5 * a * a,
            (origin[2] ?? 0) + 0.4 + 3 * rand(i, 9) * a,
          )
          bit.rotation.set(a * 9 * rand(i, 10), a * 9 * rand(i, 11), a * 6)
          bit.scale.setScalar(0.13 * (1 - a / 1.3))
        })
    }

    const probe = new THREE.Vector3()
    /** Where a point in the scene lands on the 1080×1920 frame. */
    function px(x, y, z = 0) {
      probe.set(x, y, z).project(camera)
      return [((probe.x + 1) / 2) * W, ((1 - probe.y) / 2) * H]
    }

    /* ---- 2D drawing, for build().over() ----------------------------- */
    /** A rounded label centred on (x, y). */
    function label(text, x, y, o = {}) {
      const { size = 44, bg = INK, fg = WHITE, font = SANS, weight = 800, scale = 1, alpha = 1, pad = 0.6 } = o
      if (scale <= 0 || alpha <= 0) return
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      ctx.globalAlpha *= alpha
      ctx.font = `${weight} ${size}px ${font}`
      const w = ctx.measureText(text).width + size * pad * 2
      const h = size * 1.7
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(h / 2, size * 0.45))
      ctx.fill()
      ctx.fillStyle = fg
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 0, size * 0.05)
      ctx.restore()
    }

    /** Big outlined display text centred on (x, y): counters and countdowns. */
    function big(text, x, y, o = {}) {
      const { size = 300, fill = YELLOW, stroke = INK, scale = 1, alpha = 1, rot = 0 } = o
      if (scale <= 0 || alpha <= 0) return
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.scale(scale, scale)
      ctx.globalAlpha *= alpha
      ctx.font = `900 ${size}px ${DISPLAY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.lineWidth = size * 0.16
      ctx.strokeStyle = stroke
      ctx.strokeText(text, 0, 0)
      ctx.fillStyle = fill
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }

    /** A white flash and two rings spreading from (x, y), `a` seconds after a hit. */
    function impact(a, x, y, flash = 0.85) {
      if (a < 0 || a > 0.5) return
      ctx.fillStyle = `rgba(255,255,255,${flash * (1 - seg(a, 0, 0.2))})`
      ctx.fillRect(-40, -40, W + 80, H + 80)
      for (const delay of [0, 0.1]) {
        const k = seg(a, delay, delay + 0.36)
        if (k <= 0 || k >= 1) continue
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`
        ctx.lineWidth = 26 * (1 - k) + 4
        ctx.beginPath()
        ctx.arc(x, y, 120 + 560 * outCubic(k), 0, TAU)
        ctx.stroke()
      }
    }

    const api = {
      THREE, scene, camera, ctx, lang, L: copy[lang], W, H,
      makeCanvas, textureOf, slab, faceZ, face, phone, card, plate, steel, emoji, confetti, px,
      label, big, impact,
    }
    const def = build(api)

    /* ---- The layers ------------------------------------------------- */
    function drawBackground(t) {
      ctx.fillStyle = def.base ?? YELLOW
      ctx.fillRect(0, 0, W, H)
      for (const wipe of def.wipes ?? []) {
        const k = seg(t, wipe.at, wipe.at + 0.34)
        if (k <= 0) continue
        ctx.fillStyle = wipe.color
        ctx.beginPath()
        ctx.arc(wipe.from[0], wipe.from[1], outCubic(k) * 2300, 0, TAU)
        ctx.fill()
      }
      const glow = ctx.createRadialGradient(540, 760, 80, 540, 760, 1250)
      glow.addColorStop(0, 'rgba(255,255,255,0.3)')
      glow.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
      /* Dots drifting one grid step per loop, so the loop has no seam. */
      const step = 90
      const drift = (t / duration) * step
      ctx.fillStyle = 'rgba(11,11,16,0.1)'
      for (let y = -step; y < H + step; y += step)
        for (let x = -step; x < W + step; x += step) {
          ctx.beginPath()
          ctx.arc(x + drift, y + drift, 7, 0, TAU)
          ctx.fill()
        }
    }

    function drawText(t) {
      const SIZE = 104
      const SLAB = 136
      for (const block of def.texts) {
        if (t < block.at || t >= block.until) continue
        block.lines.forEach((line, i) => {
          const k = block.at < 0 ? 1 : clamp01((t - block.at - i * 0.07) / 0.18)
          if (k <= 0) return
          ctx.font = `900 ${SIZE}px ${DISPLAY}`
          const natural = ctx.measureText(line.t).width
          const size = natural > 880 ? (SIZE * 880) / natural : SIZE
          const w = Math.min(natural, 880) + 72
          const s = 0.6 + 0.4 * outBack(k)
          ctx.save()
          ctx.translate(540, 222 + SLAB / 2 + i * (SLAB + 10))
          ctx.rotate(i % 2 ? 0.022 : -0.022)
          ctx.scale(s, s)
          ctx.globalAlpha = Math.min(1, k * 3)
          ctx.fillStyle = 'rgba(11,11,16,0.28)'
          ctx.beginPath()
          ctx.roundRect(-w / 2 + 10, -SLAB / 2 + 12, w, SLAB, 24)
          ctx.fill()
          ctx.fillStyle = line.bg
          ctx.beginPath()
          ctx.roundRect(-w / 2, -SLAB / 2, w, SLAB, 24)
          ctx.fill()
          ctx.fillStyle = line.fg
          ctx.font = `900 ${size}px ${DISPLAY}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(line.t, 0, size * 0.05)
          ctx.restore()
        })
      }
    }

    /** The address stays on screen all the way through and steps forward for the CTA. */
    function drawBrand(t) {
      const [at, until] = def.cta ?? [1e9, 1e9]
      const up = outBack(seg(t, at, at + 0.25)) * (1 - seg(t, until, until + 0.25))
      const lit = clamp01(up)
      const s = 0.62 + 0.38 * up + 0.025 * lit * Math.sin((t - at) * 9)
      ctx.save()
      ctx.translate(540, 1462)
      ctx.scale(s, s)
      ctx.font = `900 62px ${SANS}`
      const w = ctx.measureText('wtxworkout.com').width + 96
      for (const [bg, fg, alpha] of [
        [INK, WHITE, 1],
        [YELLOW, INK, lit],
      ]) {
        if (alpha <= 0) continue
        ctx.globalAlpha = alpha
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.roundRect(-w / 2, -54, w, 108, 54)
        ctx.fill()
        ctx.fillStyle = fg
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('wtxworkout.com', 0, 3)
      }
      ctx.restore()
    }

    function draw(t) {
      camera.position.set(0.22 * Math.sin((t / duration) * TAU), 0.1 * Math.sin((t / duration) * 2 * TAU), 14)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      def.pose(t)
      renderer.render(scene, camera)
      let shake = 0
      for (const [at, amp] of def.shakes ?? []) shake += pulse(t, at, amp, 58, 9)
      drawBackground(t)
      ctx.save()
      ctx.translate(shake, shake * 0.6)
      ctx.drawImage(renderer.domElement, 0, 0)
      def.over?.(t)
      drawText(t)
      drawBrand(t)
      ctx.restore()
    }

    /* ---- Playback and recording ------------------------------------- */
    const recBtn = $('rec')
    const playBtn = $('play')
    const scrub = $('scrub')
    const status = $('status')
    scrub.max = FRAMES - 1
    $('lang').textContent = lang === 'es' ? 'English' : 'Español'
    $('lang').onclick = () => {
      params.set('lang', lang === 'es' ? 'en' : 'es')
      location.search = params.toString()
    }
    $('guides').onclick = () => $('safe').classList.toggle('on')

    let playing = true
    let recording = null
    let started = performance.now()
    let frame = -1
    let notice = 0

    function show(f) {
      frame = f
      draw(((f + START) % FRAMES) / FPS)
      scrub.value = f % FRAMES
      if (!recording && performance.now() > notice)
        status.textContent = `${((f % FRAMES) / FPS).toFixed(2)} s · frame ${f % FRAMES}`
    }

    function tick(now) {
      requestAnimationFrame(tick)
      if (!playing && !recording) return
      const f = Math.floor(((now - started) / 1000) * FPS)
      if (recording && f >= recording.frames) return stopRecording()
      if (f === frame) return
      show(f)
      if (recording) {
        recording.track.requestFrame()
        status.textContent = `Recording ${(f / FPS).toFixed(1)} / ${(recording.frames / FPS).toFixed(0)} s`
      }
    }

    playBtn.onclick = () => {
      playing = !playing
      playBtn.textContent = playing ? 'Pause' : 'Play'
      if (playing) started = performance.now() - ((frame % FRAMES) / FPS) * 1000
    }
    scrub.oninput = () => {
      if (recording) return
      playing = false
      playBtn.textContent = 'Play'
      show(Number(scrub.value))
    }

    function startRecording() {
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) =>
        MediaRecorder.isTypeSupported(m),
      )
      if (!mimeType) {
        status.textContent = 'This browser cannot record WebM'
        return
      }
      /* Capture only when asked, so each drawn frame is recorded exactly once. */
      const stream = out.captureStream(0)
      const [track] = stream.getVideoTracks()
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16_000_000 })
      const chunks = []
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const link = document.createElement('a')
        link.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))
        link.download = `wtx-${slug}-${lang}.webm`
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
        status.textContent = `Saved ${link.download}`
        notice = performance.now() + 5000
      }
      recording = { recorder, track, frames: FRAMES * loops }
      recBtn.disabled = playBtn.disabled = scrub.disabled = true
      recBtn.textContent = '● Recording…'
      started = performance.now()
      frame = -1
      recorder.start()
    }

    function stopRecording() {
      recording.recorder.stop()
      recording = null
      recBtn.disabled = playBtn.disabled = scrub.disabled = false
      recBtn.textContent = '● Record'
      playing = true
      playBtn.textContent = 'Pause'
      started = performance.now()
      frame = -1
    }
    recBtn.onclick = startRecording

    /* For checking a frame from a script: __draw(seconds). */
    window.__draw = draw
    window.__duration = duration
    show(0)
    requestAnimationFrame(tick)
  }

  window.Reel = {
    W, H, FPS, TAU, YELLOW, BLUE, RED, LIME, GREEN, INK, WHITE, DISPLAY, SANS, MONO,
    clamp01, seg, lerp, outCubic, inCubic, inOut, outBack, pop, pulse, rand, dark, tint, run,
  }
})()
