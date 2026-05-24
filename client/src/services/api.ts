import { getStoredAccessToken, http, unwrap } from './http';
import type {
  LearningTask,
  ListeningEntry,
  MistakeEntry,
  QuizSession,
  SearchResult,
  SettingsForm,
  VocabularyEntry,
  WritingEvaluation,
  WritingKnowledgePoint,
  WritingTopic,
} from '@/types/models';

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
  getListening() {
    return unwrap<ListeningEntry[]>(http.get('/vocabulary/listening'));
  },
  addListeningSentence(sentence: string) {
    return unwrap<{ created: boolean; entry: ListeningEntry }>(http.post('/vocabulary/listening', { sentence }));
  },
  deleteListeningSentence(id: string) {
    return unwrap<{ removed: boolean }>(http.post(`/vocabulary/listening/${id}/delete`));
  },
  getWord(id: string) {
    return unwrap<VocabularyEntry>(http.get(`/vocabulary/${id}`));
  },
  deleteWord(id: string) {
    return unwrap<{ removed: boolean }>(http.post(`/vocabulary/${id}/delete`));
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
  ensureWordAudio(id: string) {
    return unwrap<{ audioUrl: string; audioFile: string }>(http.post(`/vocabulary/${id}/audio`));
  },
  ensureListeningAudio(id: string) {
    return unwrap<{ audioUrl: string; audioFile: string }>(http.post(`/vocabulary/listening/${id}/audio`));
  },
  updateListeningNote(id: string, note: string) {
    return unwrap<ListeningEntry>(http.post(`/vocabulary/listening/${id}/note`, { note }));
  },
  chatListening(id: string, message: string) {
    return unwrap<{ reply: string; entry: ListeningEntry | null }>(http.post(`/vocabulary/listening/${id}/chat-word`, { message }));
  },
  async streamListeningChat(id: string, message: string, onDelta: (chunk: string) => void) {
    const token = getStoredAccessToken();
    const response = await fetch(`/api/vocabulary/listening/${id}/chat-word/stream`, {
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

        const payload = JSON.parse(dataLine.slice(5).trim()) as {
          type: 'delta' | 'done' | 'error';
          content?: string;
          error?: string;
        };

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
  clearListeningChat(id: string) {
    return unwrap<ListeningEntry>(http.post(`/vocabulary/listening/${id}/chat-word/clear`));
  },
  chatWord(id: string, message: string) {
    return unwrap<{ reply: string; entry: VocabularyEntry | null }>(http.post(`/vocabulary/${id}/chat-word`, { message }));
  },
  async streamWordChat(id: string, message: string, onDelta: (chunk: string) => void) {
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

        const payload = JSON.parse(dataLine.slice(5).trim()) as {
          type: 'delta' | 'done' | 'error';
          content?: string;
          error?: string;
        };

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
  clearWordChat(id: string) {
    return unwrap<VocabularyEntry>(http.post(`/vocabulary/${id}/chat-word/clear`));
  },
  generateAudio(input: string) {
    return unwrap<{ audioUrl: string }>(http.post('/vocabulary/generate-audio', { input }));
  },
  generateQuiz() {
    return unwrap<QuizSession>(http.post('/vocabulary/generate-quiz'));
  },
  createVocabularyTask() {
    return unwrap<LearningTask>(http.post('/vocabulary/tasks/vocabulary'));
  },
  createListeningTask() {
    return unwrap<LearningTask>(http.post('/vocabulary/tasks/listening'));
  },
  getTasks() {
    return unwrap<{ tasks: LearningTask[]; mistakes: MistakeEntry[] }>(http.get('/vocabulary/tasks'));
  },
  startTask(taskId: string) {
    return unwrap<{ sessionId: string }>(http.post(`/vocabulary/tasks/${taskId}/start`));
  },
  clearTask(taskId: string) {
    return unwrap<{ removed: boolean }>(http.post(`/vocabulary/tasks/${taskId}/clear`));
  },
  startMistakeReview() {
    return unwrap<{ sessionId: string }>(http.post('/vocabulary/tasks/mistakes/start'));
  },
  getQuiz(id: string) {
    return unwrap<QuizSession>(http.get(`/vocabulary/quiz/${id}`));
  },
  submitQuizAnswer(id: string, questionId: string, response: string) {
    return unwrap<{ session: QuizSession; vocabulary?: VocabularyEntry[]; listening?: ListeningEntry[] }>(http.post(`/vocabulary/quiz/${id}/answer`, { questionId, response }));
  },
  getWritingTopics() {
    return unwrap<WritingTopic[]>(http.get('/writing/topics'));
  },
  addWritingTopic(title: string) {
    return unwrap<{ created: boolean; topic: WritingTopic }>(http.post('/writing/topics', { title }));
  },
  updateWritingTopicTitle(topicId: string, title: string) {
    return unwrap<WritingTopic>(http.post(`/writing/topics/${topicId}/title`, { title }));
  },
  deleteWritingTopic(topicId: string) {
    return unwrap<{ removed: boolean }>(http.post(`/writing/topics/${topicId}/delete`));
  },
  addWritingKnowledgePoint(topicId: string, payload: { title: string; content: string }) {
    return unwrap<{ topic: WritingTopic; point: WritingKnowledgePoint }>(http.post(`/writing/topics/${topicId}/points`, payload));
  },
  updateWritingKnowledgePoint(topicId: string, pointId: string, payload: { title: string; content: string }) {
    return unwrap<WritingTopic>(http.post(`/writing/topics/${topicId}/points/${pointId}`, payload));
  },
  deleteWritingKnowledgePoint(topicId: string, pointId: string) {
    return unwrap<WritingTopic>(http.post(`/writing/topics/${topicId}/points/${pointId}/delete`));
  },
  async streamWritingKnowledgePointChat(
    topicId: string,
    pointId: string,
    message: string,
    onDelta: (chunk: string) => void,
  ) {
    const token = getStoredAccessToken();
    const response = await fetch(`/api/writing/topics/${topicId}/points/${pointId}/chat/stream`, {
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

        const payload = JSON.parse(dataLine.slice(5).trim()) as {
          type: 'delta' | 'done' | 'error';
          content?: string;
          error?: string;
        };

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
  clearWritingKnowledgePointChat(topicId: string, pointId: string) {
    return unwrap<{ topic: WritingTopic; point: WritingKnowledgePoint }>(http.post(`/writing/topics/${topicId}/points/${pointId}/chat/clear`));
  },
  createWritingTask(topicId: string) {
    return unwrap<LearningTask>(http.post(`/writing/tasks/${topicId}`));
  },
  evaluateWritingTask(taskId: string, submission: string) {
    return unwrap<{ task: LearningTask; evaluation: WritingEvaluation; removed: boolean }>(http.post(`/writing/tasks/${taskId}/evaluate`, { submission }));
  },
};
