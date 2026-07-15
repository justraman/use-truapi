<script setup lang="ts">
// Card wrapping one SDK area; each child row demos a single composable.
defineProps<{ title: string; desc?: string }>();
</script>

<template>
  <section class="card">
    <h2 class="card-title">{{ title }}</h2>
    <p v-if="desc" class="card-desc">{{ desc }}</p>
    <div class="card-rows">
      <slot />
    </div>
  </section>
</template>
