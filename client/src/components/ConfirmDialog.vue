<template>
  <Teleport to="body">
    <div v-if="confirm.state.open" class="confirm-overlay" @click.self="confirm.answer(false)">
      <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <p class="eyebrow">Please confirm</p>
        <h2 id="confirm-dialog-title">{{ confirm.state.title }}</h2>
        <p v-if="confirm.state.message" class="confirm-message">{{ confirm.state.message }}</p>
        <div class="confirm-actions">
          <button class="button button-secondary" type="button" @click="confirm.answer(false)">
            {{ confirm.state.cancelLabel }}
          </button>
          <button
            ref="confirmButtonRef"
            class="button button-primary"
            :class="{ 'confirm-danger': confirm.state.tone === 'danger' }"
            type="button"
            @click="confirm.answer(true)"
          >
            {{ confirm.state.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useConfirmStore } from '@/stores/confirm';

const confirm = useConfirmStore();
const confirmButtonRef = ref<HTMLButtonElement | null>(null);

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    confirm.answer(false);
  }
}

// Focus the primary action so Enter answers immediately; Escape cancels from
// anywhere on the page while the dialog is open.
watch(
  () => confirm.state.open,
  async (open) => {
    if (open) {
      window.addEventListener('keydown', handleKeydown);
      await nextTick();
      confirmButtonRef.value?.focus();
      return;
    }

    window.removeEventListener('keydown', handleKeydown);
  },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>