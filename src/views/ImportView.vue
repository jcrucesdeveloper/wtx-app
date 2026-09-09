<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import { decodeRoutineParam, ROUTINE_PARAM } from '@/lib/share'

const route = useRoute()
const router = useRouter()
const routines = useRoutinesStore()

type Decoded =
  | { state: 'empty' }
  | { state: 'bad-link' }
  | { state: 'invalid'; text: string; error: string }
  | { state: 'ok'; text: string }

const decoded = computed<Decoded>(() => {
  const raw = route.query[ROUTINE_PARAM]
  const param = Array.isArray(raw) ? raw[0] : raw
  if (!param) return { state: 'empty' }

  let text: string
  try {
    text = decodeRoutineParam(param)
  } catch {
    return { state: 'bad-link' }
  }

  const result = parseTemplateText(text)
  return result.ok ? { state: 'ok', text } : { state: 'invalid', text, error: result.error }
})

const parsed = computed(() =>
  decoded.value.state === 'ok' ? parseTemplateText(decoded.value.text) : null,
)

const existing = computed(() =>
  decoded.value.state === 'ok' ? routines.findByText(decoded.value.text) : undefined,
)

const addError = ref('')

function add() {
  if (decoded.value.state !== 'ok') return
  addError.value = ''
  try {
    const routine = routines.add(decoded.value.text, '')
    router.replace(`/templates/${routine.id}`)
  } catch (error) {
    addError.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <AppPage title="Import routine">
    <template #actions>
      <RouterLink to="/" class="cancel">Cancel</RouterLink>
    </template>

    <p v-if="decoded.state === 'empty'" class="msg">
      This link has no routine in it. Open a share link from another device, or load a file from
      Templates.
    </p>

    <p v-else-if="decoded.state === 'bad-link'" class="msg error">
      This share link is corrupted and can't be read.
    </p>

    <div v-else-if="decoded.state === 'invalid'" class="stack">
      <p class="error">Received a routine, but it isn't valid:</p>
      <p class="error">{{ decoded.error }}</p>
      <pre class="source">{{ decoded.text }}</pre>
    </div>

    <div v-else-if="parsed?.ok" class="stack">
      <RouterLink v-if="existing" :to="`/templates/${existing.id}`" class="already">
        Already in your library — open it
      </RouterLink>

      <h2 class="name">{{ parsed.template.name }}</h2>
      <p v-if="parsed.template.notes" class="notes">{{ parsed.template.notes }}</p>
      <RoutineSummary :template="parsed.template" />
      <ExerciseList :exercises="parsed.template.exercises" :unit="parsed.template.unit" />

      <p v-if="addError" class="error">{{ addError }}</p>
      <button type="button" class="primary" @click="add">
        {{ existing ? 'Add another copy' : 'Add to library' }}
      </button>
    </div>
  </AppPage>
</template>

<style scoped>
.cancel {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg {
  font-size: 14px;
  opacity: 0.75;
}

.name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-heading);
}

.notes {
  font-size: 14px;
  opacity: 0.8;
  margin-top: -8px;
}

.already {
  align-self: flex-start;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
}

.source {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  overflow-x: auto;
  white-space: pre;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}

.primary {
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}
</style>
