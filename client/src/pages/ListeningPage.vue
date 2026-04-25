<template>
  <section class="vocabulary-page">
    <div class="card listening-input-card">
      <div class="section-heading">
        <p class="eyebrow">Listening</p>
        <h2>Add Practice Sentences</h2>
        <p class="subtle-copy">Each sentence starts at familiarity 0 and grows to 20.</p>
      </div>
      <form class="listening-form" @submit.prevent="handleAddSentence">
        <input
          v-model="sentenceInput"
          type="text"
          placeholder="Type an English sentence for listening practice"
          :disabled="adding"
        />
        <button class="button button-primary" type="submit" :disabled="adding || !sentenceInput.trim()">
          {{ adding ? 'Adding...' : 'Add Sentence' }}
        </button>
      </form>
    </div>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <section class="card listening-list-card">
      <div class="inline-heading">
        <h3>Sentence Bank</h3>
        <span class="muted-text">{{ store.listeningItems.length }} items</span>
      </div>

      <p v-if="store.listeningItems.length === 0" class="empty-copy">No listening sentences yet.</p>

      <div v-else class="list-scroller">
        <article v-for="item in store.listeningItems" :key="item.id" class="task-row">
          <div class="task-main">
            <p>{{ item.sentence }}</p>
            <p class="muted-text">Familiarity: {{ item.familiarity }}</p>
          </div>
          <button class="icon-button" type="button" aria-label="Play sentence" title="Play sentence" @click="playSentence(item.id, item.audioFile)">
            🔊
          </button>
        </article>
      </div>
    </section>

    <div class="learning-bar">
      <div>
        <p class="eyebrow">Practice</p>
        <h2>Generate a Listening Session</h2>
        <p class="subtle-copy">Blank ratio increases with familiarity. At 20, you fill the whole sentence.</p>
      </div>
      <button class="button button-primary" type="button" :disabled="taskLoading" @click="startLearning">
        {{ taskLoading ? 'Preparing...' : 'Learning' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useVocabularyStore } from '@/stores/vocabulary';
import { getStoredMediaAudioUrl } from '@/utils/audioCache';

const store = useVocabularyStore();
const router = useRouter();
const sentenceInput = ref('');
const error = ref('');
const message = ref('');
const adding = ref(false);
const taskLoading = ref(false);

onMounted(async () => {
  try {
    await store.fetchListening();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load listening sentences.';
  }
});

async function handleAddSentence() {
  const sentence = sentenceInput.value.trim();
  if (!sentence) {
    return;
  }

  error.value = '';
  message.value = '';
  adding.value = true;
  try {
    const data = await store.addListeningSentence(sentence);
    message.value = data.created ? 'Sentence added.' : 'Sentence already exists.';
    sentenceInput.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add sentence.';
  } finally {
    adding.value = false;
  }
}

async function playSentence(id: string, audioFile?: string) {
  error.value = '';
  try {
    const directUrl = getStoredMediaAudioUrl(audioFile);
    const audioUrl = directUrl || await store.ensureListeningAudio(id);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio playback failed.';
  }
}

async function startLearning() {
  error.value = '';
  taskLoading.value = true;
  try {
    await store.createListeningTask();
    await router.push('/tasks');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create listening task.';
  } finally {
    taskLoading.value = false;
  }
}
</script>
