<template>
  <RouterView />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
</script>
