import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import { getAudioUrl } from '@/utils/audioCache';
export const useVocabularyStore = defineStore('vocabulary', () => {
    const items = ref([]);
    const selectedId = ref('');
    const searchResult = ref(null);
    const loading = ref(false);
    const searching = ref(false);
    const savingWord = ref(false);
    const quizSession = ref(null);
    const tasks = ref([]);
    const mistakes = ref([]);
    const tasksLoading = ref(false);
    const listeningItems = ref([]);
    const listeningLoading = ref(false);
    const selectedWord = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);
    function updateWord(id, updater) {
        items.value = items.value.map((item) => (item.id === id ? updater(item) : item));
    }
    async function fetchVocabulary() {
        loading.value = true;
        try {
            items.value = await api.getVocabulary();
            if (!selectedId.value && items.value.length > 0) {
                selectedId.value = items.value[0].id;
            }
        }
        finally {
            loading.value = false;
        }
    }
    async function selectWord(id) {
        selectedId.value = id;
        const entry = await api.getWord(id);
        items.value = items.value.map((item) => (item.id === entry.id ? entry : item));
    }
    async function searchWord(query) {
        searching.value = true;
        try {
            searchResult.value = await api.searchWord(query);
            // Warm up TTS cache after a successful search. Do not block UI on this request.
            void getAudioUrl(searchResult.value.ttsText).catch(() => undefined);
        }
        finally {
            searching.value = false;
        }
    }
    async function saveWord() {
        if (!searchResult.value) {
            throw new Error('No search result available.');
        }
        if (!searchResult.value.found) {
            throw new Error('Cannot save because the word was not found.');
        }
        savingWord.value = true;
        try {
            const data = await api.saveWord(searchResult.value);
            items.value = await api.getVocabulary();
            selectedId.value = data.entry.id;
            return data;
        }
        finally {
            savingWord.value = false;
        }
    }
    async function updateNote(note) {
        if (!selectedId.value) {
            return;
        }
        const entry = await api.updateNote(selectedId.value, note);
        items.value = items.value.map((item) => (item.id === entry.id ? entry : item));
    }
    async function sendChatMessage(message) {
        if (!selectedId.value) {
            throw new Error('No word selected.');
        }
        const userMessageId = createClientMessageId('chat-user');
        const assistantMessageId = createClientMessageId('chat-assistant');
        const now = new Date().toISOString();
        const currentWordId = selectedId.value;
        updateWord(currentWordId, (entry) => ({
            ...entry,
            updatedAt: now,
            chatHistory: [
                ...entry.chatHistory,
                {
                    id: userMessageId,
                    role: 'user',
                    content: message,
                    createdAt: now,
                },
                {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    createdAt: now,
                },
            ],
        }));
        try {
            const reply = await api.streamWordChat(currentWordId, message, (chunk) => {
                updateWord(currentWordId, (entry) => ({
                    ...entry,
                    chatHistory: entry.chatHistory.map((item) => (item.id === assistantMessageId
                        ? { ...item, content: item.content + chunk }
                        : item)),
                    updatedAt: new Date().toISOString(),
                }));
            });
            return reply;
        }
        catch (error) {
            updateWord(currentWordId, (entry) => ({
                ...entry,
                chatHistory: entry.chatHistory.map((item) => (item.id === assistantMessageId
                    ? { ...item, content: error instanceof Error ? error.message : 'Chat failed.' }
                    : item)),
                updatedAt: new Date().toISOString(),
            }));
            throw error;
        }
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
    async function fetchTasks() {
        tasksLoading.value = true;
        try {
            const data = await api.getTasks();
            tasks.value = data.tasks;
            mistakes.value = data.mistakes;
        }
        finally {
            tasksLoading.value = false;
        }
    }
    async function createVocabularyTask() {
        const task = await api.createVocabularyTask();
        tasks.value = [task, ...tasks.value.filter((item) => item.id !== task.id)];
        return task;
    }
    async function startTask(taskId) {
        const data = await api.startTask(taskId);
        return data.sessionId;
    }
    async function clearTask(taskId) {
        await api.clearTask(taskId);
        tasks.value = tasks.value.filter((item) => item.id !== taskId);
    }
    async function startMistakeReview() {
        const data = await api.startMistakeReview();
        return data.sessionId;
    }
    async function fetchListening() {
        listeningLoading.value = true;
        try {
            listeningItems.value = await api.getListening();
        }
        finally {
            listeningLoading.value = false;
        }
    }
    async function addListeningSentence(sentence) {
        const data = await api.addListeningSentence(sentence);
        listeningItems.value = await api.getListening();
        return data;
    }
    async function deleteListeningSentence(id) {
        await api.deleteListeningSentence(id);
        listeningItems.value = listeningItems.value.filter((item) => item.id !== id);
    }
    async function createListeningTask() {
        const task = await api.createListeningTask();
        tasks.value = [task, ...tasks.value.filter((item) => item.id !== task.id)];
        return task;
    }
    async function ensureWordAudio(id) {
        const data = await api.ensureWordAudio(id);
        updateWord(id, (entry) => ({
            ...entry,
            audioFile: data.audioFile,
            updatedAt: new Date().toISOString(),
        }));
        return data.audioUrl;
    }
    async function ensureListeningAudio(id) {
        const data = await api.ensureListeningAudio(id);
        listeningItems.value = listeningItems.value.map((item) => (item.id === id
            ? { ...item, audioFile: data.audioFile, updatedAt: new Date().toISOString() }
            : item));
        return data.audioUrl;
    }
    async function loadQuiz(id) {
        quizSession.value = await api.getQuiz(id);
    }
    async function submitQuizAnswer(questionId, response) {
        if (!quizSession.value) {
            throw new Error('No quiz session loaded.');
        }
        const data = await api.submitQuizAnswer(quizSession.value.id, questionId, response);
        quizSession.value = data.session;
        if (data.vocabulary) {
            items.value = data.vocabulary;
        }
        if (data.listening) {
            listeningItems.value = data.listening;
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
        tasks,
        mistakes,
        tasksLoading,
        listeningItems,
        listeningLoading,
        fetchVocabulary,
        selectWord,
        searchWord,
        saveWord,
        updateNote,
        sendChatMessage,
        clearChatHistory,
        generateQuiz,
        fetchTasks,
        createVocabularyTask,
        createListeningTask,
        ensureWordAudio,
        ensureListeningAudio,
        startTask,
        clearTask,
        startMistakeReview,
        fetchListening,
        addListeningSentence,
        deleteListeningSentence,
        loadQuiz,
        submitQuizAnswer,
    };
});
function createClientMessageId(prefix) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
