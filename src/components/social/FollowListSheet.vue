<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import PersonRow from '@/components/social/PersonRow.vue'
import { useSocialStore, type Person } from '@/stores/social'

export type FollowListKind = 'followers' | 'following'

const props = defineProps<{
  userId: string
  /** Which list to show; `null` keeps the sheet closed. */
  kind: FollowListKind | null
}>()

const emit = defineEmits<{
  close: []
  'update:kind': [kind: FollowListKind]
}>()

const { t } = useI18n()
const social = useSocialStore()

const people = ref<Person[]>([])
const loading = ref(false)
const failed = ref(false)

async function load(kind: FollowListKind) {
  loading.value = true
  failed.value = false
  people.value = []
  try {
    people.value = await social.followList(props.userId, kind)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.kind, props.userId] as const,
  ([kind]) => {
    if (kind) void load(kind)
  },
  { immediate: true },
)
</script>

<template>
  <BottomSheet :open="kind !== null" :title="kind ? t(`social.profile.${kind}`) : ''" @close="emit('close')">
    <div class="tabs" role="tablist">
      <button
        v-for="option in ['followers', 'following'] as const"
        :key="option"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab--active': kind === option }"
        :aria-selected="kind === option"
        @click="emit('update:kind', option)"
      >
        {{ t(`social.profile.${option}`) }}
      </button>
    </div>

    <p v-if="loading" class="note">{{ t('social.loading') }}</p>
    <p v-else-if="failed" class="note">{{ t('social.loadError') }}</p>
    <p v-else-if="!people.length" class="note">{{ t(`social.profile.${kind}Empty`) }}</p>
    <ul v-else class="list">
      <li v-for="person in people" :key="person.id">
        <PersonRow
          :id="person.id"
          :name="person.display_name"
          :follows-me="person.follows_me"
          :hint="person.follows_me ? t('social.followsYou') : undefined"
          @open="emit('close')"
        />
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
}

.tab {
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.tab--active {
  background: var(--color-background);
  color: var(--color-heading);
}

.note {
  font-size: 13px;
  opacity: 0.65;
  padding: 12px 0;
  text-align: center;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
}
</style>
