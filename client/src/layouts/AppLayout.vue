<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">LingoAI</span>
        <span class="brand-copy">LLM-driven English practice</span>
      </div>
      <nav class="nav-links">
        <RouterLink to="/tasks" class="nav-link">Tasks</RouterLink>
        <RouterLink to="/vocabulary" class="nav-link">Vocabulary</RouterLink>
        <RouterLink to="/listening" class="nav-link">Listening</RouterLink>
        <RouterLink to="/setting" class="nav-link">Setting</RouterLink>
      </nav>
    </header>
    <main class="page-shell">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>
