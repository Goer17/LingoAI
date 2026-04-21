<template>
  <div class="login-page">
    <LoginCard v-model="tokenInput" :loading="auth.loading" :error="error" @submit="submit" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoginCard from '@/components/LoginCard.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const tokenInput = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.login(tokenInput.value.trim());
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/vocabulary';
    await router.push(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed.';
  }
}
</script>
