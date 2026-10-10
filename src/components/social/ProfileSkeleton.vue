<script setup lang="ts">
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
</script>

<template>
  <div class="skeleton" aria-hidden="true">
    <div class="row">
      <SkeletonBlock width="72px" height="72px" radius="circle" />
      <div class="col">
        <SkeletonBlock width="55%" height="18px" />
        <SkeletonBlock width="80%" height="12px" />
      </div>
    </div>
    <div class="line">
      <SkeletonBlock v-for="i in 3" :key="i" class="grow" height="40px" />
    </div>
    <div class="line">
      <SkeletonBlock class="grow" height="48px" radius="lg" />
      <SkeletonBlock class="grow" height="48px" radius="lg" />
    </div>
    <SkeletonBlock height="120px" radius="lg" />
    <SkeletonBlock height="120px" radius="lg" />
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.col {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.line {
  display: flex;
  gap: 10px;
}

.grow {
  flex: 1;
  min-width: 0;
}
</style>
