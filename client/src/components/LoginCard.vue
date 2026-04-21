<template>
  <section class="card auth-card">
    <div class="section-heading">
      <p class="eyebrow">Private Access</p>
      <h1>Enter Access Token</h1>
      <p class="subtle-copy">This browser will remember the token after a successful login.</p>
    </div>
    <form class="stack" @submit.prevent="$emit('submit')">
      <label class="field">
        <span>Token</span>
        <input v-model="model" type="password" placeholder="Paste the token from .token" autocomplete="off" />
      </label>
      <button class="button button-primary" type="submit" :disabled="loading || !model.trim()">
        {{ loading ? 'Signing In...' : 'Sign In' }}
      </button>
      <p v-if="error" class="error-text">{{ error }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
const model = defineModel<string>({ required: true });

defineProps<{
  loading: boolean;
  error: string;
}>();

defineEmits<{
  submit: [];
}>();
</script>
