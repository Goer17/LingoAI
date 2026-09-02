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
    const selectedListeningId = ref('');
    const listeningGroups = ref([]);
    const selectedListeningGroupId = ref('');
    const writingTopics = ref([]);
    const selectedWritingTopicId = ref('');
    const selectedWritingPointId = ref('');
    const writingLoading = ref(false);
    const selectedWord = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);
    const selectedListening = computed(() => (listeningItems.value.find((item) => item.id === selectedListeningId.value) ?? null));
    const selectedWritingTopic = computed(() => (writingTopics.value.find((item) => item.id === selectedWritingTopicId.value) ?? null));
    const selectedWritingPoint = computed(() => {
        const topic = selectedWritingTopic.value;
        if (!topic) {
            return null;
        }
        return topic.knowledgePoints.find((item) => item.id === selectedWritingPointId.value) ?? null;
    });
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
    async function deleteWord(id) {
        await api.deleteWord(id);
        items.value = items.value.filter((item) => item.id !== id);
        if (selectedId.value === id) {
            selectedId.value = items.value[0]?.id ?? '';
        }
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
    async function retryTask(taskId) {
        const task = await api.retryTask(taskId);
        tasks.value = tasks.value.map((item) => (item.id === task.id ? task : item));
        return task;
    }
    async function startMistakeReview() {
        const data = await api.startMistakeReview();
        return data.sessionId;
    }
    async function fetchListening() {
        listeningLoading.value = true;
        try {
            const groupId = selectedListeningGroupId.value || undefined;
            listeningItems.value = await api.getListening(groupId);
            if (!selectedListeningId.value && listeningItems.value.length > 0) {
                selectedListeningId.value = listeningItems.value[0].id;
            }
        }
        finally {
            listeningLoading.value = false;
        }
    }
    async function fetchListeningGroups() {
        listeningGroups.value = await api.getListeningGroups();
        if (!selectedListeningGroupId.value && listeningGroups.value.length > 0) {
            selectedListeningGroupId.value = listeningGroups.value[0].id;
        }
    }
    async function createListeningGroup(name) {
        const data = await api.createListeningGroup(name);
        listeningGroups.value = await api.getListeningGroups();
        if (data.created) {
            selectedListeningGroupId.value = data.group.id;
            await fetchListening();
        }
        return data;
    }
    async function deleteListeningGroup(id) {
        await api.deleteListeningGroup(id);
        listeningGroups.value = await api.getListeningGroups();
        if (selectedListeningGroupId.value === id) {
            selectedListeningGroupId.value = listeningGroups.value[0]?.id ?? '';
            await fetchListening();
        }
    }
    function selectListeningGroup(id) {
        selectedListeningGroupId.value = id;
        fetchListening();
    }
    async function addListeningSentence(sentence) {
        const groupId = selectedListeningGroupId.value || undefined;
        const data = await api.addListeningSentence(sentence, groupId);
        listeningItems.value = await api.getListening(groupId);
        selectedListeningId.value = data.entry.id;
        return data;
    }
    async function deleteListeningSentence(id) {
        await api.deleteListeningSentence(id);
        listeningItems.value = listeningItems.value.filter((item) => item.id !== id);
        if (selectedListeningId.value === id) {
            selectedListeningId.value = listeningItems.value[0]?.id ?? '';
        }
    }
    async function createListeningTask() {
        const task = await api.createListeningTask();
        tasks.value = [task, ...tasks.value.filter((item) => item.id !== task.id)];
        return task;
    }
    async function createListeningTaskForGroup(groupId) {
        const task = await api.createListeningTaskForGroup(groupId);
        tasks.value = [task, ...tasks.value.filter((item) => item.id !== task.id)];
        return task;
    }
    function updateWritingTopicLocal(topic) {
        writingTopics.value = writingTopics.value.map((item) => (item.id === topic.id ? topic : item));
    }
    function updateWritingPointLocal(topicId, pointId, updater) {
        writingTopics.value = writingTopics.value.map((topic) => {
            if (topic.id !== topicId) {
                return topic;
            }
            return {
                ...topic,
                knowledgePoints: topic.knowledgePoints.map((point) => (point.id === pointId ? updater(point) : point)),
            };
        });
    }
    async function fetchWritingTopics() {
        writingLoading.value = true;
        try {
            writingTopics.value = await api.getWritingTopics();
            if (!selectedWritingTopicId.value && writingTopics.value.length > 0) {
                selectedWritingTopicId.value = writingTopics.value[0].id;
            }
            if (selectedWritingTopicId.value) {
                const currentTopic = writingTopics.value.find((item) => item.id === selectedWritingTopicId.value) ?? null;
                if (!currentTopic) {
                    selectedWritingTopicId.value = writingTopics.value[0]?.id ?? '';
                    selectedWritingPointId.value = '';
                }
                else if (selectedWritingPointId.value) {
                    const pointExists = currentTopic.knowledgePoints.some((item) => item.id === selectedWritingPointId.value);
                    if (!pointExists) {
                        selectedWritingPointId.value = currentTopic.knowledgePoints[0]?.id ?? '';
                    }
                }
                else if (currentTopic.knowledgePoints.length > 0) {
                    selectedWritingPointId.value = currentTopic.knowledgePoints[0].id;
                }
            }
        }
        finally {
            writingLoading.value = false;
        }
    }
    async function addWritingTopic(title) {
        const result = await api.addWritingTopic(title);
        if (result.created) {
            writingTopics.value = [result.topic, ...writingTopics.value.filter((item) => item.id !== result.topic.id)];
            selectedWritingTopicId.value = result.topic.id;
            selectedWritingPointId.value = '';
        }
        else {
            updateWritingTopicLocal(result.topic);
            selectedWritingTopicId.value = result.topic.id;
            selectedWritingPointId.value = result.topic.knowledgePoints[0]?.id ?? '';
        }
        return result;
    }
    async function updateWritingTopicTitle(topicId, title) {
        const topic = await api.updateWritingTopicTitle(topicId, title);
        updateWritingTopicLocal(topic);
        return topic;
    }
    async function deleteWritingTopic(topicId) {
        await api.deleteWritingTopic(topicId);
        writingTopics.value = writingTopics.value.filter((item) => item.id !== topicId);
        if (selectedWritingTopicId.value === topicId) {
            selectedWritingTopicId.value = writingTopics.value[0]?.id ?? '';
            selectedWritingPointId.value = writingTopics.value[0]?.knowledgePoints[0]?.id ?? '';
        }
    }
    function selectWritingTopic(topicId) {
        selectedWritingTopicId.value = topicId;
        const topic = writingTopics.value.find((item) => item.id === topicId) ?? null;
        if (!topic) {
            selectedWritingPointId.value = '';
            return;
        }
        if (!topic.knowledgePoints.some((item) => item.id === selectedWritingPointId.value)) {
            selectedWritingPointId.value = topic.knowledgePoints[0]?.id ?? '';
        }
    }
    function selectWritingPoint(pointId) {
        selectedWritingPointId.value = pointId;
    }
    async function addWritingKnowledgePoint(topicId, payload) {
        const result = await api.addWritingKnowledgePoint(topicId, payload);
        updateWritingTopicLocal(result.topic);
        selectedWritingTopicId.value = topicId;
        selectedWritingPointId.value = result.point.id;
        return result;
    }
    async function updateWritingKnowledgePoint(topicId, pointId, payload) {
        const topic = await api.updateWritingKnowledgePoint(topicId, pointId, payload);
        updateWritingTopicLocal(topic);
        return topic;
    }
    async function deleteWritingKnowledgePoint(topicId, pointId) {
        const topic = await api.deleteWritingKnowledgePoint(topicId, pointId);
        updateWritingTopicLocal(topic);
        if (selectedWritingPointId.value === pointId) {
            selectedWritingPointId.value = topic.knowledgePoints[0]?.id ?? '';
        }
    }
    async function sendWritingKnowledgePointChatMessage(topicId, pointId, message) {
        const userMessageId = createClientMessageId('writing-chat-user');
        const assistantMessageId = createClientMessageId('writing-chat-assistant');
        const now = new Date().toISOString();
        updateWritingPointLocal(topicId, pointId, (point) => ({
            ...point,
            updatedAt: now,
            chatHistory: [
                ...point.chatHistory,
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
            const reply = await api.streamWritingKnowledgePointChat(topicId, pointId, message, (chunk) => {
                updateWritingPointLocal(topicId, pointId, (point) => ({
                    ...point,
                    updatedAt: new Date().toISOString(),
                    chatHistory: point.chatHistory.map((item) => (item.id === assistantMessageId
                        ? { ...item, content: item.content + chunk }
                        : item)),
                }));
            });
            return reply;
        }
        catch (error) {
            updateWritingPointLocal(topicId, pointId, (point) => ({
                ...point,
                updatedAt: new Date().toISOString(),
                chatHistory: point.chatHistory.map((item) => (item.id === assistantMessageId
                    ? { ...item, content: error instanceof Error ? error.message : 'Chat failed.' }
                    : item)),
            }));
            throw error;
        }
    }
    async function clearWritingKnowledgePointChat(topicId, pointId) {
        const result = await api.clearWritingKnowledgePointChat(topicId, pointId);
        updateWritingTopicLocal(result.topic);
        return result;
    }
    async function createExpressionTask(topicId) {
        const task = await api.createExpressionTask(topicId);
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
    function selectListening(id) {
        selectedListeningId.value = id;
    }
    function updateListening(id, updater) {
        listeningItems.value = listeningItems.value.map((item) => (item.id === id ? updater(item) : item));
    }
    async function updateListeningNote(note) {
        if (!selectedListeningId.value) {
            return;
        }
        const entry = await api.updateListeningNote(selectedListeningId.value, note);
        updateListening(entry.id, () => entry);
    }
    async function sendListeningChatMessage(message) {
        if (!selectedListeningId.value) {
            throw new Error('No sentence selected.');
        }
        const userMessageId = createClientMessageId('listen-chat-user');
        const assistantMessageId = createClientMessageId('listen-chat-assistant');
        const now = new Date().toISOString();
        const currentSentenceId = selectedListeningId.value;
        updateListening(currentSentenceId, (entry) => ({
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
            const reply = await api.streamListeningChat(currentSentenceId, message, (chunk) => {
                updateListening(currentSentenceId, (entry) => ({
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
            updateListening(currentSentenceId, (entry) => ({
                ...entry,
                chatHistory: entry.chatHistory.map((item) => (item.id === assistantMessageId
                    ? { ...item, content: error instanceof Error ? error.message : 'Chat failed.' }
                    : item)),
                updatedAt: new Date().toISOString(),
            }));
            throw error;
        }
    }
    async function clearListeningChatHistory() {
        if (!selectedListeningId.value) {
            throw new Error('No sentence selected.');
        }
        const entry = await api.clearListeningChat(selectedListeningId.value);
        updateListening(entry.id, () => entry);
        return entry;
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
        selectedListeningId,
        selectedListening,
        listeningGroups,
        selectedListeningGroupId,
        writingTopics,
        selectedWritingTopicId,
        selectedWritingPointId,
        selectedWritingTopic,
        selectedWritingPoint,
        writingLoading,
        fetchVocabulary,
        selectWord,
        searchWord,
        saveWord,
        updateNote,
        sendChatMessage,
        clearChatHistory,
        deleteWord,
        generateQuiz,
        fetchTasks,
        createVocabularyTask,
        createListeningTask,
        createListeningTaskForGroup,
        fetchListeningGroups,
        createListeningGroup,
        deleteListeningGroup,
        selectListeningGroup,
        fetchWritingTopics,
        addWritingTopic,
        updateWritingTopicTitle,
        deleteWritingTopic,
        selectWritingTopic,
        selectWritingPoint,
        addWritingKnowledgePoint,
        updateWritingKnowledgePoint,
        deleteWritingKnowledgePoint,
        sendWritingKnowledgePointChatMessage,
        clearWritingKnowledgePointChat,
        createExpressionTask,
        ensureWordAudio,
        ensureListeningAudio,
        selectListening,
        updateListeningNote,
        sendListeningChatMessage,
        clearListeningChatHistory,
        startTask,
        clearTask,
        retryTask,
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
