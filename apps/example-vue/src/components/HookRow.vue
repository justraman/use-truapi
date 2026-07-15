<script setup lang="ts">
// One row: chip(s) naming the composable(s) on the left, their live demo on the right.
import { computed } from "vue";

const props = defineProps<{ hook: string | string[] }>();
const hooks = computed(() => (Array.isArray(props.hook) ? props.hook : [props.hook]));
</script>

<template>
  <div class="hook-row">
    <div class="hook-names">
      <code v-for="name in hooks" :key="name" class="hook-chip">{{ name }}</code>
    </div>
    <div class="hook-demo">
      <slot />
    </div>
  </div>
</template>
