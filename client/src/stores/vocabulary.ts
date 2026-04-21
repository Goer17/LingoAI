import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import { getAudioUrl } from '@/utils/audioCache';
import type { QuizSession, SearchResult, VocabularyEntry } from '@/types/models';

export const useVocabularyStore = defineStore('vocabulary', () => {
  const items = ref<VocabularyEntry[]>([]);
  const selectedId = ref('');
  const searchResult = ref<SearchResult | null>(null);
  const loading = ref(false);
  const searching = ref(false);
  const savingWord = ref(false);
  const quizSession = ref<QuizSession | null>(null);

  const selectedWord = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);

  async function fetchVocabulary() {
    loading.value = true;
    try {
      items.value = await api.getVocabulary();
      if (!selectedId.value && items.value.length > 0) {
        selectedId.value = items.value[0].id;
      }
    } finally {
      loading.value = false;
    }
  }

  async function selectWord(id: string) {
    selectedId.value = id;
    const entry = await api.getWord(id);
    items.value = items.value.map((item) => (item.id === entry.id ? entry : item));
  }

  async function searchWord(query: string) {
    searching.value = true;
    try {
      searchResult.value = await api.searchWord(query);
      // Warm up TTS cache after a successful search. Do not block UI on this request.
      void getAudioUrl(searchResult.value.ttsText).catch(() => undefined);
    } finally {
      searching.value = false;
    }
  }

  async function saveWord() {
    if (!searchResult.value) {
      throw new Error('No search result available.');
    }

    savingWord.value = true;
    try {
      const data = await api.saveWord(searchResult.value);
      items.value = await api.getVocabulary();
      selectedId.value = data.entry.id;
      return data;
    } finally {
      savingWord.value = false;
    }
  }

  async function updateNote(note: string) {
    if (!selectedId.value) {
      return;
    }

    const entry = await api.updateNote(selectedId.value, note);
    items.value = items.value.map((item) => (item.id === entry.id ? entry : item));
  }

  async function sendChatMessage(message: string) {
    if (!selectedId.value) {
      throw new Error('No word selected.');
    }

    const data = await api.chatWord(selectedId.value, message);
    if (data.entry) {
      items.value = items.value.map((item) => (item.id === data.entry!.id ? data.entry! : item));
    }
    return data.reply;
  }

  async function clearChatHistory() {
    if (!selectedId.value) {
      throw new Error('No word selected.');
    }

    const entry = await api.clearWordChat(selectedId.value);
    items.value = items.value.map((item) => (item.id === entry.id ? entry : item));
    return entry;
  }

  async function generateQuiz() {
    quizSession.value = await api.generateQuiz();
    return quizSession.value;
  }

  async function loadQuiz(id: string) {
    quizSession.value = await api.getQuiz(id);
  }

  async function submitQuizAnswer(questionId: string, response: string) {
    if (!quizSession.value) {
      throw new Error('No quiz session loaded.');
    }

    const data = await api.submitQuizAnswer(quizSession.value.id, questionId, response);
    quizSession.value = data.session;
    if (data.vocabulary) {
      items.value = data.vocabulary;
    }
    return data;
  }

  return {
    items,
    selectedId,
    selectedWord,
    searchResult,
    loading,
    searching,
    savingWord,
    quizSession,
    fetchVocabulary,
    selectWord,
    searchWord,
    saveWord,
    updateNote,
    sendChatMessage,
    clearChatHistory,
    generateQuiz,
    loadQuiz,
    submitQuizAnswer,
  };
});
