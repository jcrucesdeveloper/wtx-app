<template>
  <div class="skeleton" aria-hidden="true">
    <div class="row">
      <span class="block block--avatar" />
      <div class="col">
        <span class="block block--name" />
        <span class="block block--line" />
      </div>
    </div>
    <div class="stats">
      <span v-for="i in 3" :key="i" class="block block--stat" />
    </div>
    <div class="buttons">
      <span class="block block--btn" />
      <span class="block block--btn" />
    </div>
    <span class="block block--card" />
    <span class="block block--card" />
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.stats,
.buttons {
  display: flex;
  gap: 10px;
}

.block {
  display: block;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  animation: pulse 1.2s ease-in-out infinite;
}

.block--avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
}

.block--name {
  width: 55%;
  height: 18px;
}

.block--line {
  width: 80%;
  height: 12px;
}

.block--stat {
  flex: 1;
  height: 40px;
}

.block--btn {
  flex: 1;
  height: 44px;
}

.block--card {
  height: 120px;
}

@keyframes pulse {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .block {
    animation: none;
  }
}
</style>
