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
