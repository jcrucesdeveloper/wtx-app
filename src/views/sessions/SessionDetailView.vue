<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import { useSessionsStore } from '@/stores/sessions'
import { formatNumber } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : null))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/sessions')
}
</script>

<template>
  <AppPage :title="result?.ok ? result.session.name : 'Session'">
    <template #leading>
      <button type="button" class="icon-btn" aria-label="Back" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="!stored" class="msg">This session is no longer in your history.</p>

    <template v-else-if="result">
      <div v-if="result.ok" class="stack">
        <p class="date">{{ result.session.date }}</p>
        <p v-if="result.session.notes" class="notes">{{ result.session.notes }}</p>

        <div class="summary">
          <span class="chip">{{ result.session.exerciseCount }} exercises</span>
          <span class="chip">{{ result.session.totalWorkingSets }} sets</span>
          <span v-if="result.session.totalVolume > 0" class="chip">
            {{ formatNumber(result.session.totalVolume) }} {{ result.session.unit }} volume
          </span>
          <span class="chip" :class="{ 'chip--done': result.session.isComplete }">
            {{ result.session.isComplete ? 'Complete' : 'Incomplete' }}
          </span>
        </div>

        <LoggedExerciseList :exercises="result.session.exercises" :unit="result.session.unit" />
      </div>

      <div v-else class="stack">
        <p class="error">{{ result.error }}</p>
        <pre class="source">{{ stored.rawText }}</pre>
      </div>
    </template>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

.icon-btn:first-child {
  margin-left: -4px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.date {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.55;
}

.notes {
  font-size: 14px;
  opacity: 0.8;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.chip--done {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
</style>
