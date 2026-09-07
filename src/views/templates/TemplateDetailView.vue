<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

function remove() {
  if (!routine.value) return
  if (!confirm('Remove this routine from your library?')) return
  routines.remove(routine.value.id)
  router.replace('/templates')
}
</script>

<template>
  <AppPage :title="result?.ok ? result.template.name : 'Routine'">
    <template #actions>
      <RouterLink to="/templates" class="back">Back</RouterLink>
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
        <button type="button" class="share" @click="shareOpen = true">Share via QR</button>
        <button type="button" class="danger" @click="remove">Remove</button>
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
.back {
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
  border-radius: 12px;
  background: var(--color-background-mute);
  overflow-x: auto;
  white-space: pre;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 8px;
}

.share {
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
}

.danger {
  border: 1px solid var(--color-border);
  background: transparent;
  color: #e11d48;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
}
</style>
