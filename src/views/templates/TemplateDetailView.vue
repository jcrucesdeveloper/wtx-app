<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Share2 } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'
import ShareRoutineSheet from '@/components/share/ShareRoutineSheet.vue'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'

const route = useRoute()
const router = useRouter()
const routines = useRoutinesStore()

const id = computed(() => String(route.params.id))
const routine = computed(() => routines.getById(id.value))
const result = computed(() => (routine.value ? parseTemplateText(routine.value.rawText) : null))

const shareName = computed(() => {
  if (!routine.value) return ''
  return result.value?.ok ? result.value.template.name : routine.value.filename
})

const showSource = ref(false)
const shareOpen = ref(false)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/')
}

function remove() {
  if (!routine.value) return
  if (!confirm('Remove this routine from your library?')) return
  routines.remove(routine.value.id)
  router.replace('/')
}
</script>

<template>
  <AppPage :title="result?.ok ? result.template.name : 'Routine'">
    <template #leading>
      <button type="button" class="icon-btn" aria-label="Back" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <template #actions>
      <button
        v-if="routine && result"
        type="button"
        class="icon-btn"
        aria-label="Share routine"
        @click="shareOpen = true"
      >
        <Share2 :size="19" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="!routine" class="msg">This routine is no longer in your library.</p>

    <template v-else-if="result">
      <div v-if="result.ok" class="stack">
        <p v-if="result.template.notes" class="notes">{{ result.template.notes }}</p>
        <RoutineSummary :template="result.template" />

        <ExerciseList :exercises="result.template.exercises" :unit="result.template.unit" />

        <button type="button" class="link" @click="showSource = !showSource">
          {{ showSource ? 'Hide' : 'Show' }} source
        </button>
        <pre v-if="showSource" class="source">{{ routine.rawText }}</pre>
      </div>

      <div v-else class="stack">
        <p class="error">{{ result.error }}</p>
        <pre class="source">{{ routine.rawText }}</pre>
      </div>

      <div class="footer-actions">
        <button type="button" class="danger" @click="remove">Remove from library</button>
      </div>
    </template>

    <ShareRoutineSheet
      v-if="routine"
      v-model:open="shareOpen"
      :raw-text="routine.rawText"
      :name="shareName"
    />
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

/* Pull the back button to the visual edge so the tap target still feels inset. */
.icon-btn:first-child {
  margin-left: -4px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notes {
  font-size: 14px;
  opacity: 0.8;
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.link {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
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
}

.footer-actions {
  display: flex;
  margin-top: 8px;
}

.danger {
  width: 100%;
  border: 1px solid var(--color-border-hover);
  background: transparent;
  color: #e11d48;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
}
</style>
