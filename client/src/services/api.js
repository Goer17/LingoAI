import { http, unwrap } from './http';
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
    chatWord(id, message) {
        return unwrap(http.post(`/vocabulary/${id}/chat-word`, { message }));
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
    getQuiz(id) {
        return unwrap(http.get(`/vocabulary/quiz/${id}`));
    },
    submitQuizAnswer(id, questionId, response) {
        return unwrap(http.post(`/vocabulary/quiz/${id}/answer`, { questionId, response }));
    },
};
