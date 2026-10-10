import { ref, watch } from 'vue'

/**
 * TEMPORARY — redesign Phase 1. Lets the proposed layout be compared on a
 * real device against the current one. Everything under `src/proto/` (and the
 * few call sites marked `PROTO`) goes away once the direction is settled.
 */
export type ProtoDirection = 'current' | 'focus'

export const PROTO_DIRECTIONS: ProtoDirection[] = ['current', 'focus']

const STORAGE_KEY = 'wtx:proto-direction'

function load(): ProtoDirection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ProtoDirection | null
    return stored && PROTO_DIRECTIONS.includes(stored) ? stored : 'current'
  } catch {
    return 'current'
  }
}

export const protoDirection = ref<ProtoDirection>(load())

// The stylesheet (directions.css) keys everything off this attribute.
watch(
  protoDirection,
  (direction) => {
    if (direction === 'current') delete document.documentElement.dataset.direction
    else document.documentElement.dataset.direction = direction
    try {
      localStorage.setItem(STORAGE_KEY, direction)
    } catch {
      /* storage unavailable — the choice just won't survive a reload */
    }
  },
  { immediate: true },
)

export function nextProtoDirection() {
  const i = PROTO_DIRECTIONS.indexOf(protoDirection.value)
  protoDirection.value = PROTO_DIRECTIONS[(i + 1) % PROTO_DIRECTIONS.length]!
}
