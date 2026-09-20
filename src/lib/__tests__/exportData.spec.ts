import { describe, it, expect } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { buildDataExportZip, exportFilename } from '../exportData'
import type { StoredRoutine } from '@/stores/routines'
import type { StoredSession } from '@/stores/sessions'

const routine: StoredRoutine = {
  id: 'r1',
  filename: 'push.wtt',
  rawText: '# Push Day\nunit: kg\n\nBench Press | reps 4x8 | 60 | rest 1m30s\n',
  addedAt: 1000,
}

const session: StoredSession = {
  id: 's1',
  filename: 'push-2024-01-01.wts',
  rawText: '# Push Day\ndate: 2024-01-01\n',
  addedAt: 2000,
  routineId: 'r1',
}

describe('buildDataExportZip', () => {
  it('puts routines and sessions under their own folders, verbatim', () => {
    const zip = unzipSync(buildDataExportZip([routine], [session]))
    expect(Object.keys(zip).sort()).toEqual(['routines/push.wtt', 'sessions/push-2024-01-01.wts'])
    expect(strFromU8(zip['routines/push.wtt']!)).toBe(routine.rawText)
    expect(strFromU8(zip['sessions/push-2024-01-01.wts']!)).toBe(session.rawText)
  })

  it('disambiguates duplicate filenames instead of overwriting', () => {
    const dup: StoredRoutine = { ...routine, id: 'r2', rawText: 'different text' }
    const zip = unzipSync(buildDataExportZip([routine, dup], []))
    expect(Object.keys(zip).sort()).toEqual(['routines/push (2).wtt', 'routines/push.wtt'])
    expect(strFromU8(zip['routines/push (2).wtt']!)).toBe('different text')
  })

  it('falls back to the id when a filename is missing', () => {
    const noName: StoredRoutine = { ...routine, filename: '' }
    const zip = unzipSync(buildDataExportZip([noName], []))
    expect(Object.keys(zip)).toEqual(['routines/r1.wtt'])
  })
})

describe('exportFilename', () => {
  it('produces a date-stamped zip filename', () => {
    expect(exportFilename(new Date('2024-03-05T12:00:00Z'))).toBe('wtx-export-2024-03-05.zip')
  })
})
