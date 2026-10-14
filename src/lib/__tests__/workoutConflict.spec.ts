import { describe, it, expect } from 'vitest'
import { isConflict, startVerdict, type RunningState } from '../workoutConflict'

const IDLE: RunningState = { session: null, openRoomId: null }
const SOLO: RunningState = { session: { routineId: 'push' }, openRoomId: null }
const GROUP: RunningState = { session: { routineId: 'push', roomId: 'room-a' }, openRoomId: 'room-a' }
const LOBBY: RunningState = { session: null, openRoomId: 'room-a' }

describe('startVerdict', () => {
  it('lets anything start when nothing is running', () => {
    expect(startVerdict(IDLE, { kind: 'solo', routineId: 'push' })).toBe('start')
    expect(startVerdict(IDLE, { kind: 'new-room' })).toBe('start')
    expect(startVerdict(IDLE, { kind: 'group', roomId: 'room-a' })).toBe('start')
  })

  describe('with a workout of your own running', () => {
    it('goes back to it when the same routine is started again', () => {
      expect(startVerdict(SOLO, { kind: 'solo', routineId: 'push' })).toBe('resume')
    })

    it('offers to replace it with another routine of your own', () => {
      expect(startVerdict(SOLO, { kind: 'solo', routineId: 'pull' })).toBe('replace')
    })

    it('does not let a group room be created or joined', () => {
      expect(startVerdict(SOLO, { kind: 'new-room' })).toBe('workout_in_progress')
    })

    it('does not start a group workout over it', () => {
      expect(startVerdict(SOLO, { kind: 'group', roomId: 'room-a' })).toBe('workout_in_progress')
    })
  })

  describe('with a group workout running', () => {
    it('goes back to it from its own room', () => {
      expect(startVerdict(GROUP, { kind: 'group', roomId: 'room-a' })).toBe('resume')
    })

    it('does not start a workout of your own, even the same routine', () => {
      expect(startVerdict(GROUP, { kind: 'solo', routineId: 'push' })).toBe('group_workout_in_progress')
      expect(startVerdict(GROUP, { kind: 'solo', routineId: 'pull' })).toBe('group_workout_in_progress')
    })

    it('does not let another room be created, joined or started', () => {
      expect(startVerdict(GROUP, { kind: 'new-room' })).toBe('group_workout_in_progress')
      expect(startVerdict(GROUP, { kind: 'group', roomId: 'room-b' })).toBe('group_workout_in_progress')
    })

    it('still counts after its room has closed', () => {
      const closed: RunningState = { ...GROUP, openRoomId: null }
      expect(startVerdict(closed, { kind: 'solo', routineId: 'pull' })).toBe('group_workout_in_progress')
    })
  })

  describe('waiting in a group room', () => {
    it('starts the workout of that room', () => {
      expect(startVerdict(LOBBY, { kind: 'group', roomId: 'room-a' })).toBe('start')
    })

    it('does not start a workout of your own', () => {
      expect(startVerdict(LOBBY, { kind: 'solo', routineId: 'push' })).toBe('in_room')
    })

    it('does not let another room be created, joined or started', () => {
      expect(startVerdict(LOBBY, { kind: 'new-room' })).toBe('in_room')
      expect(startVerdict(LOBBY, { kind: 'group', roomId: 'room-b' })).toBe('in_room')
    })
  })
})

describe('isConflict', () => {
  it('is true only for the verdicts that stop a start', () => {
    expect(['start', 'resume', 'replace'].map((v) => isConflict(v as 'start'))).toEqual([false, false, false])
    expect(
      ['workout_in_progress', 'group_workout_in_progress', 'in_room'].map((v) => isConflict(v as 'in_room')),
    ).toEqual([true, true, true])
  })
})
