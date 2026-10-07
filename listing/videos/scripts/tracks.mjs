// Which soundtrack each reel plays. One entry per composition, and no two the
// same, so no two posts on an account share a sound.
//
// A track is { style, key, prog, seed } (see soundtracks.mjs). Compositions
// not listed keep the launch track in music.mjs: the store and YouTube videos,
// and the three `reel-*` cuts.
//
//   node scripts/tracks.mjs            list every track and check they differ
//   node scripts/render.mjs <name> --audio-only     re-score a rendered reel

import { fileURLToPath } from 'node:url'
import { STYLES, describeTrack } from './soundtracks.mjs'

const D2 = 'daily-2026-10-02-es-'
const ES = 'daily-2026-10-03-es-'
const EN = 'daily-2026-10-03-en-'

// key: semitones above C. The style follows what the reel does: hard styles
// under the hype cuts, quiet ones under the loops and single takes.
const TABLE = {
  [`${D2}record`]: { style: 'hardstyle', key: 5, prog: 0 },
  [`${D2}texto`]: { style: 'lofi', key: 2, prog: 0 },
  [`${D2}racha`]: { style: 'phonk', key: 4, prog: 0 },
  [`${D2}como-registrar`]: { style: 'house', key: 9, prog: 0 },
  [`${D2}25-entrenos`]: { style: 'piano', key: 0, prog: 0 },

  [`${ES}v01-speedrun`]: { style: 'chiptune', key: 7, prog: 0 },
  [`${ES}v02-notas`]: { style: 'phonk', key: 11, prog: 1 },
  [`${ES}v03-loop`]: { style: 'synthwave', key: 6, prog: 0 },
  [`${ES}v04-top3`]: { style: 'brasil', key: 1, prog: 1 },
  // v05-satisfying has no music by design: its audio is the taps themselves.
  [`${ES}v06-adivina`]: { style: 'trap', key: 3, prog: 0 },
  [`${ES}v07-chat`]: { style: 'reggaeton', key: 10, prog: 0 },
  [`${ES}v08-wrapped`]: { style: 'disco', key: 8, prog: 0 },
  [`${ES}v09-opinion`]: { style: 'drill', key: 0, prog: 0 },
  [`${ES}v10-copia`]: { style: 'house', key: 4, prog: 2 },
  [`${ES}v11-pov`]: { style: 'lofi', key: 7, prog: 1 },
  [`${ES}v12-antes-hoy`]: { style: 'hardstyle', key: 9, prog: 1 },
  [`${ES}v13-diagnostico`]: { style: 'techno', key: 2, prog: 1 },
  [`${ES}v14-tier-list`]: { style: 'jersey', key: 5, prog: 0 },
  [`${ES}v15-elige-color`]: { style: 'amapiano', key: 11, prog: 0 },
  [`${ES}v16-mira-esto`]: { style: 'dnb', key: 6, prog: 0 },
  [`${ES}v17-tipos`]: { style: 'guaracha', key: 1, prog: 0 },
  [`${ES}v18-senal`]: { style: 'ambient', key: 3, prog: 0 },
  [`${ES}v19-nadie-habla`]: { style: 'synthwave', key: 10, prog: 1 },
  [`${ES}v20-qr`]: { style: 'drill', key: 8, prog: 1 },
  [`${ES}v21-dime`]: { style: 'brasil', key: 6, prog: 2 },
  [`${ES}v22-flags`]: { style: 'reggaeton', key: 2, prog: 1 },
  [`${ES}v23-tambien-yo`]: { style: 'eurodance', key: 0, prog: 0 },
  [`${ES}v24-busqueda`]: { style: 'amapiano', key: 4, prog: 1 },
  [`${ES}v25-pausa`]: { style: 'chiptune', key: 2, prog: 2 },
  [`${ES}v26-encuentra`]: { style: 'dnb', key: 11, prog: 1 },
  [`${ES}v27-escondida`]: { style: 'trap', key: 7, prog: 2 },
  [`${ES}v28-ven-conmigo`]: { style: 'disco', key: 3, prog: 1 },
  [`${ES}v29-ticket`]: { style: 'piano', key: 5, prog: 2 },
  [`${ES}v30-puntua`]: { style: 'guaracha', key: 9, prog: 1 },

  [`${EN}v21-dime`]: { style: 'phonk', key: 8, prog: 2 },
  [`${EN}v22-flags`]: { style: 'house', key: 1, prog: 1 },
  [`${EN}v23-tambien-yo`]: { style: 'stomp', key: 4, prog: 0 },
  [`${EN}v24-busqueda`]: { style: 'lofi', key: 10, prog: 2 },
  [`${EN}v25-pausa`]: { style: 'eurodance', key: 7, prog: 1 },
  [`${EN}v26-encuentra`]: { style: 'techno', key: 6, prog: 0 },
  [`${EN}v27-escondida`]: { style: 'synthwave', key: 1, prog: 2 },
  [`${EN}v28-ven-conmigo`]: { style: 'jersey', key: 10, prog: 1 },
  [`${EN}v29-ticket`]: { style: 'amapiano', key: 8, prog: 2 },
  [`${EN}v30-puntua`]: { style: 'brasil', key: 3, prog: 3 },
}

/** The seed defaults to the composition's name, so every melody is its own. */
export const TRACKS = Object.fromEntries(
  Object.entries(TABLE).map(([name, track]) => [name, { seed: name, ...track }]),
)

export const trackFor = (name) => TRACKS[name]

/** Throws if two compositions would get the same style, key and progression. */
export function checkTracks() {
  const seen = new Map()
  for (const [name, track] of Object.entries(TRACKS)) {
    if (!STYLES[track.style]) throw new Error(`${name}: unknown style ${track.style}`)
    const id = `${track.style}/${track.key}/${track.prog % STYLES[track.style].progs.length}`
    if (seen.has(id)) throw new Error(`${name} and ${seen.get(id)} share a track (${id})`)
    seen.set(id, name)
  }
  return seen.size
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const n = checkTracks()
  for (const [name, track] of Object.entries(TRACKS)) {
    console.log(`${name.padEnd(42)} ${describeTrack(track)}`)
  }
  console.log(`\n${n} tracks, all different.`)
}
