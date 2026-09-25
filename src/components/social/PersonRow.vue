<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import UserAvatar from '@/components/social/UserAvatar.vue'
import FollowButton from '@/components/social/FollowButton.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  id: string
  name: string
  /** A second line, e.g. why they're suggested or "Follows you". */
  hint?: string
  followsMe?: boolean
}>()

const emit = defineEmits<{
  open: []
}>()

const auth = useAuthStore()
const isMe = computed(() => props.id === auth.user?.id)
</script>

<template>
  <RouterLink :to="{ name: 'social-profile', params: { id } }" class="person" @click="emit('open')">
    <UserAvatar :id="id" :name="name" :size="42" />
    <span class="person__body">
      <span class="person__name">{{ name }}</span>
      <span v-if="hint" class="person__hint">{{ hint }}</span>
    </span>
    <FollowButton v-if="!isMe" :user-id="id" :follows-me="followsMe" />
  </RouterLink>
</template>

<style scoped>
.person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: inherit;
  text-decoration: none;
}

.person:hover {
  background: transparent;
}

.person__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.person__name {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person__hint {
  font-size: 12px;
  opacity: 0.65;
}
</style>
