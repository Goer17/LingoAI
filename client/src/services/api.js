import { getStoredAccessToken, http, unwrap } from './http';
export const api = {
    login(token) {
        return unwrap(http.post('/auth/login', { token }));
    },
    getSettings() {
        return unwrap(http.get('/settings'));
    },
    saveSettings(payload) {
        return unwrap(http.post('/settings', payload));
    },
    getVocabulary() {
        return unwrap(http.get('/vocabulary'));
    },
    getListening() {
        return unwrap(http.get('/vocabulary/listening'));
    },
    addListeningSentence(sentence) {
        return unwrap(http.post('/vocabulary/listening', { sentence }));
    },
    deleteListeningSentence(id) {
        return unwrap(http.post(`/vocabulary/listening/${id}/delete`));
    },
    getWord(id) {
        return unwrap(http.get(`/vocabulary/${id}`));
    },
    searchWord(query) {
        return unwrap(http.post('/vocabulary/search-word', { query }));
    },
    saveWord(result) {
        return unwrap(http.post('/vocabulary', { result }));
    },
    updateNote(id, note) {
        return unwrap(http.post(`/vocabulary/${id}/note`, { note }));
    },
    ensureWordAudio(id) {
        return unwrap(http.post(`/vocabulary/${id}/audio`));
    },
    ensureListeningAudio(id) {
        return unwrap(http.post(`/vocabulary/listening/${id}/audio`));
    },
    chatWord(id, message) {
        return unwrap(http.post(`/vocabulary/${id}/chat-word`, { message }));
    },
    async streamWordChat(id, message, onDelta) {
        const token = getStoredAccessToken();
        const response = await fetch(`/api/vocabulary/${id}/chat-word/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'x-access-token': token } : {}),
            },
            body: JSON.stringify({ message }),
        });
        if (!response.ok || !response.body) {
            throw new Error('Chat failed.');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';
        let doneReceived = false;
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';
            for (const event of events) {
                const dataLine = event
                    .split('\n')
                    .map((line) => line.trim())
                    .find((line) => line.startsWith('data:'));
                if (!dataLine) {
                    continue;
                }
                const payload = JSON.parse(dataLine.slice(5).trim());
                if (payload.type === 'delta' && payload.content) {
                    fullReply += payload.content;
                    onDelta(payload.content);
                }
                if (payload.type === 'error') {
                    throw new Error(payload.error || 'Chat failed.');
                }
                if (payload.type === 'done') {
                    doneReceived = true;
                }
            }
        }
        if (!doneReceived) {
            throw new Error('Chat stream ended unexpectedly.');
        }
        return fullReply.trim();
    },
    clearWordChat(id) {
        return unwrap(http.post(`/vocabulary/${id}/chat-word/clear`));
    },
    generateAudio(input) {
        return unwrap(http.post('/vocabulary/generate-audio', { input }));
    },
    generateQuiz() {
        return unwrap(http.post('/vocabulary/generate-quiz'));
    },
    createVocabularyTask() {
        return unwrap(http.post('/vocabulary/tasks/vocabulary'));
    },
    createListeningTask() {
        return unwrap(http.post('/vocabulary/tasks/listening'));
    },
    getTasks() {
        return unwrap(http.get('/vocabulary/tasks'));
    },
    startTask(taskId) {
        return unwrap(http.post(`/vocabulary/tasks/${taskId}/start`));
    },
    clearTask(taskId) {
        return unwrap(http.post(`/vocabulary/tasks/${taskId}/clear`));
    },
    startMistakeReview() {
        return unwrap(http.post('/vocabulary/tasks/mistakes/start'));
    },
    getQuiz(id) {
        return unwrap(http.get(`/vocabulary/quiz/${id}`));
    },
    submitQuizAnswer(id, questionId, response) {
        return unwrap(http.post(`/vocabulary/quiz/${id}/answer`, { questionId, response }));
    },
};
