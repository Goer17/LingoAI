import { http, unwrap } from './http';
import type { QuizSession, SearchResult, SettingsForm, VocabularyEntry } from '@/types/models';

export const api = {
  login(token: string) {
    return unwrap<{ token: string }>(http.post('/auth/login', { token }));
  },
  getSettings() {
    return unwrap<SettingsForm>(http.get('/settings'));
  },
  saveSettings(payload: Omit<SettingsForm, 'updatedAt'>) {
    return unwrap<SettingsForm>(http.post('/settings', payload));
  },
  getVocabulary() {
    return unwrap<VocabularyEntry[]>(http.get('/vocabulary'));
  },
  getWord(id: string) {
    return unwrap<VocabularyEntry>(http.get(`/vocabulary/${id}`));
  },
  searchWord(query: string) {
    return unwrap<SearchResult>(http.post('/vocabulary/search-word', { query }));
  },
  saveWord(result: SearchResult) {
    return unwrap<{ created: boolean; entry: VocabularyEntry }>(http.post('/vocabulary', { result }));
  },
  updateNote(id: string, note: string) {
    return unwrap<VocabularyEntry>(http.post(`/vocabulary/${id}/note`, { note }));
  },
  chatWord(id: string, message: string) {
    return unwrap<{ reply: string; entry: VocabularyEntry | null }>(http.post(`/vocabulary/${id}/chat-word`, { message }));
  },
  clearWordChat(id: string) {
    return unwrap<VocabularyEntry>(http.post(`/vocabulary/${id}/chat-word/clear`));
  },
  generateAudio(input: string) {
    return unwrap<{ audioUrl: string }>(http.post('/vocabulary/generate-audio', { input }));
  },
  generateQuiz() {
    return unwrap<QuizSession>(http.post('/vocabulary/generate-quiz'));
  },
  getQuiz(id: string) {
    return unwrap<QuizSession>(http.get(`/vocabulary/quiz/${id}`));
  },
  submitQuizAnswer(id: string, questionId: string, response: string) {
    return unwrap<{ session: QuizSession; vocabulary?: VocabularyEntry[] }>(http.post(`/vocabulary/quiz/${id}/answer`, { questionId, response }));
  },
};
