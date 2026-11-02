import { Capacitor } from '@capacitor/core'
import { useSettingsStore } from '@/stores/settings'

/**
 * Two soft rising notes, G5 then C6, 360 ms in all: short enough to hear
 * after every set without wearing thin, rising so it reads as "go". Sine
 * tones peaking at −6 dBFS, synthesized for WTX. The same file is
 * android/app/src/main/res/raw/rest_end.wav, so both play the same samples.
 */
const SOUND_URL = `${import.meta.env.BASE_URL}sounds/rest-end.wav`

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }

/**
 * On Android the session notification plays the chime natively, from the
 * same timer that ends the rest there, so it sounds with the screen locked
 * and follows the ringer mode. The web view stays quiet so it never doubles.
 */
export function restSoundPlaysNatively(): boolean {
  return (
    Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('WtxSessionNotification')
  )
}

let context: AudioContext | null = null
let buffer: Promise<AudioBuffer | null> | null = null

function audioContext(): AudioContext | null {
  if (context) return context
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
  if (!Ctor) return null
  // Ambient: mixes with the user's music instead of pausing it, and obeys the iOS silent switch.
  const session = (navigator as AudioSessionNavigator).audioSession
  if (session) session.type = 'ambient'
  context = new Ctor()
  return context
}

function loadBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  buffer ??= fetch(SOUND_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.arrayBuffer()
    })
    .then((bytes) => ctx.decodeAudioData(bytes))
    .catch((err) => {
      console.error('[restSound] load failed', err)
      buffer = null
      return null
    })
  return buffer
}

/** Audio starts locked until a tap (and iOS locks it again after the background): unlock on taps. */
function unlock() {
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  void loadBuffer(ctx)
}

/**
 * The chime for the end of a rest, played with Web Audio while the app is
 * open. Paired with the haptic, never instead of it, and off in settings.
 */
export const RestSoundService = {
  /** Once at startup: taps keep audio unlocked, so the chime can play later without one. */
  init(): void {
    if (restSoundPlaysNatively()) return
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
  },

  /** Plays the chime now, regardless of the setting (the settings preview). */
  async play(): Promise<void> {
    const ctx = audioContext()
    if (!ctx) return
    try {
      if (ctx.state !== 'running') await ctx.resume()
    } catch {
      return
    }
    const audio = await loadBuffer(ctx)
    if (!audio) return
    const source = ctx.createBufferSource()
    source.buffer = audio
    source.connect(ctx.destination)
    source.start()
  },

  /** A rest just ran out with the app on screen: chime if the setting is on. */
  restEnded(): void {
    if (restSoundPlaysNatively()) return
    if (!useSettingsStore().restSoundEnabled) return
    void this.play()
  },
}
