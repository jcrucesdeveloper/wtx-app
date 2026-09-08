<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="scrim"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
      >
        <div class="sheet">
          <div class="sheet__grabber" />
          <header class="sheet__head">
            <h2>{{ title }}</h2>
            <button type="button" class="icon-btn" aria-label="Close" @click="emit('close')">
              ✕
            </button>
          </header>

          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.sheet {
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 20px calc(20px + env(safe-area-inset-bottom));
  background: var(--color-background);
  border-radius: 20px 20px 0 0;
}

.sheet__grabber {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-hover);
  margin: 4px 0;
}

.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet__head h2 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 15px;
  padding: 6px;
  cursor: pointer;
  opacity: 0.6;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
