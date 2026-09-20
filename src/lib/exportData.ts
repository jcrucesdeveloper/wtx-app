import { zipSync, type Zippable } from 'fflate'
import type { StoredRoutine } from '@/stores/routines'
import type { StoredSession } from '@/stores/sessions'

/** Avoids collisions when two entries share a filename (e.g. duplicate imports). */
function uniqueName(taken: Set<string>, filename: string): string {
  if (!taken.has(filename)) {
    taken.add(filename)
    return filename
  }
  const dot = filename.lastIndexOf('.')
  const base = dot === -1 ? filename : filename.slice(0, dot)
  const ext = dot === -1 ? '' : filename.slice(dot)
  let index = 2
  let candidate = `${base} (${index})${ext}`
  while (taken.has(candidate)) {
    index += 1
    candidate = `${base} (${index})${ext}`
  }
  taken.add(candidate)
  return candidate
}

/**
 * Builds a `.zip` containing every stored routine and session as its
 * original `.wtt` / `.wts` file, under `routines/` and `sessions/`.
 */
export function buildDataExportZip(routines: StoredRoutine[], sessions: StoredSession[]): Uint8Array {
  const files: Zippable = {}
  const encoder = new TextEncoder()

  const routineNames = new Set<string>()
  for (const routine of routines) {
    const name = uniqueName(routineNames, routine.filename || `${routine.id}.wtt`)
    files[`routines/${name}`] = encoder.encode(routine.rawText)
  }

  const sessionNames = new Set<string>()
  for (const session of sessions) {
    const name = uniqueName(sessionNames, session.filename || `${session.id}.wts`)
    files[`sessions/${name}`] = encoder.encode(session.rawText)
  }

  return zipSync(files)
}

/** A stable, date-stamped file name for the export. */
export function exportFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10)
  return `wtx-export-${stamp}.zip`
}

/** Triggers a browser download of the zipped export. */
export function downloadDataExport(zip: Uint8Array, filename = exportFilename()): void {
  const blob = new Blob([zip as BlobPart], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
