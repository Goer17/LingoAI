<template>
  <section class="vocabulary-page">
    <SearchBar v-model="query" :loading="store.searching" @search="handleSearch" />

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <SearchResultCard
      :result="store.searchResult"
      :show-chinese="showChinese"
      :saving="store.savingWord"
      @save="handleSaveWord"
      @toggle-translation="showChinese = !showChinese"
      @play-audio="playSearchAudio"
      @regenerate-audio="regenerateSearchAudio"
    />

    <div class="workspace-grid">
      <WordList :items="store.items" :selected-id="store.selectedId" @select="store.selectWord" />
      <WordDetailPanel
        :word="store.selectedWord"
        :show-chinese="showChinese"
        :loading="chatLoading"
        @toggle-translation="showChinese = !showChinese"
        @play-audio="playWordAudio"
        @regenerate-audio="regenerateWordAudio"
        @save-note="handleSaveNote"
        @send-chat="handleSendChat"
        @clear-chat="handleClearChat"
        @delete="handleDeleteWord"
      />
    </div>

    <div class="learning-bar">
      <div>
        <p class="eyebrow">Practice</p>
        <h2>Generate a Learning Session</h2>
        <p class="subtle-copy">The quiz will pick up to 10 words with the lowest familiarity first.</p>
      </div>
      <button class="button button-primary" type="button" :disabled="quizLoading" @click="startLearning">
        {{ quizLoading ? 'Preparing...' : 'Learning' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import SearchBar from '@/components/SearchBar.vue';
import SearchResultCard from '@/components/SearchResultCard.vue';
import WordDetailPanel from '@/components/WordDetailPanel.vue';
import WordList from '@/components/WordList.vue';
import { useVocabularyStore } from '@/stores/vocabulary';
import { api } from '@/services/api';
import { buildMediaUrl, clearCachedAudioUrl, clearCachedMediaUrl, getAudioUrl, getStoredMediaAudioUrl } from '@/utils/audioCache';

const store = useVocabularyStore();
const router = useRouter();
const query = ref('');
const error = ref('');
const message = ref('');
const showChinese = ref(false);
const chatLoading = ref(false);
const quizLoading = ref(false);
const audioVersions = reactive<Record<string, number>>({});

onMounted(async () => {
  try {
    await store.fetchVocabulary();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load vocabulary.';
  }
});

async function handleSearch() {
  error.value = '';
  message.value = '';
  try {
    await store.searchWord(query.value.trim());
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Search failed.';
  }
}

async function handleSaveWord() {
  error.value = '';
  message.value = '';
  try {
    const data = await store.saveWord();
    message.value = data.created ? 'Word added to vocabulary.' : 'This word already exists.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Save failed.';
  }
}

async function handleSaveNote(note: string) {
  error.value = '';
  try {
    await store.updateNote(note);
    message.value = 'Note saved.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save note.';
  }
}

async function handleSendChat(messageInput: string) {
  error.value = '';
  chatLoading.value = true;
  try {
    await store.sendChatMessage(messageInput);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chat failed.';
  } finally {
    chatLoading.value = false;
  }
}

async function handleClearChat() {
  error.value = '';
  try {
    await store.clearChatHistory();
    message.value = 'Tutor chat cleared.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to clear chat.';
  }
}

async function handleDeleteWord(id: string) {
  error.value = '';
  message.value = '';
  try {
    await store.deleteWord(id);
    message.value = 'Word deleted.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete word.';
  }
}

async function playSearchAudio(input: string) {
  error.value = '';
  try {
    const audioUrl = await getAudioUrl(input);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio playback failed.';
  }
}

async function regenerateSearchAudio(input: string) {
  error.value = '';
  try {
    clearCachedAudioUrl(input);
    const { audioUrl } = await api.regenerateAudio(input);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio regeneration failed.';
  }
}

async function playWordAudio() {
  error.value = '';
  const word = store.selectedWord;
  if (!word) {
    return;
  }

  try {
    const version = audioVersions[word.id];
    let audioUrl: string;
    if (version && word.audioFile) {
      audioUrl = buildMediaUrl(word.audioFile, version);
    } else {
      const directUrl = getStoredMediaAudioUrl(word.audioFile);
      audioUrl = directUrl || await store.ensureWordAudio(word.id);
    }
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio playback failed.';
  }
}

async function regenerateWordAudio() {
  error.value = '';
  const word = store.selectedWord;
  if (!word) {
    return;
  }

  try {
    const { audioFile } = await api.regenerateWordAudio(word.id);
    word.audioFile = audioFile;
    if (audioFile) {
      clearCachedMediaUrl(audioFile);
      const version = (audioVersions[word.id] ?? 0) + 1;
      audioVersions[word.id] = version;
      const audioUrl = buildMediaUrl(audioFile, version);
      const audio = new Audio(audioUrl);
      await audio.play();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio regeneration failed.';
  }
}

async function startLearning() {
  error.value = '';
  quizLoading.value = true;
  try {
    await store.createVocabularyTask();
    await router.push('/tasks');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create task.';
  } finally {
    quizLoading.value = false;
  }
}
</script>
