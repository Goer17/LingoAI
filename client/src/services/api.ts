import { getStoredAccessToken, http, unwrap } from './http';
import type {
  LearningTask,
  ListeningEntry,
  ListeningGroup,
  MistakeEntry,
  PolishResult,
  QuizSession,
  ScenarioData,
  ScenarioSummary,
  SearchResult,
  SettingsForm,
  VocabularyEntry,
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
  saveSettings(payload: Pick<SettingsForm, 'models'>) {
    return unwrap<SettingsForm>(http.post('/settings', payload));
  },
  testModelEntry(category: 'language' | 'audio' | 'image', entryId: string) {
    return unwrap<{ ok: boolean; latencyMs: number; sample?: string; error?: string }>(
      http.post('/settings/test', { category, entryId }),
    );
  },
  getVocabulary() {
    return unwrap<VocabularyEntry[]>(http.get('/vocabulary'));
  },
  getListening(groupId?: string) {
    const params = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return unwrap<ListeningEntry[]>(http.get(`/vocabulary/listening${params}`));
  },
  addListeningSentence(sentence: string, groupId?: string) {
    return unwrap<{ created: boolean; entry: ListeningEntry }>(http.post('/vocabulary/listening', { sentence, groupId }));
  },
  getListeningGroups() {
    return unwrap<ListeningGroup[]>(http.get('/vocabulary/listening/groups'));
  },
  createListeningGroup(name: string) {
    return unwrap<{ created: boolean; group: ListeningGroup }>(http.post('/vocabulary/listening/groups', { name }));
  },
  deleteListeningGroup(id: string) {
    return unwrap<{ removed: boolean }>(http.post(`/vocabulary/listening/groups/${id}/delete`));
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
  hasCommonAudio(word: string) {
    return unwrap<{ hasCommon: boolean; audioUrl: string | null }>(
      http.get('/vocabulary/common-audio', { params: { word } }),
    );
  },
  suggestWords(query: string, limit = 8) {
    return unwrap<{ suggestions: string[]; query: string }>(
      http.get('/vocabulary/suggest', { params: { query, limit } }),
    );
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
  regenerateWordAudio(id: string) {
    return unwrap<{ audioUrl: string; audioFile: string }>(http.post(`/vocabulary/${id}/audio`, { force: true }));
  },
  ensureListeningAudio(id: string) {
    return unwrap<{ audioUrl: string; audioFile: string }>(http.post(`/vocabulary/listening/${id}/audio`));
  },
  regenerateListeningAudio(id: string) {
    return unwrap<{ audioUrl: string; audioFile: string }>(http.post(`/vocabulary/listening/${id}/audio`, { force: true }));
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
  regenerateAudio(input: string) {
    return unwrap<{ audioUrl: string }>(http.post('/vocabulary/generate-audio', { input, force: true }));
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
  createListeningTaskForGroup(groupId: string) {
    return unwrap<LearningTask>(http.post(`/vocabulary/tasks/listening/${encodeURIComponent(groupId)}`));
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
  async streamQuizQuestionChat(
    payload: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      word: string;
      sentence: string;
      type: string;
      answer: string;
      userResponse: string;
      isCorrect: boolean;
      newMessage: string;
    },
    onDelta: (chunk: string) => void,
  ) {
    const token = getStoredAccessToken();
    const response = await fetch('/api/vocabulary/quiz/question-chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-access-token': token } : {}),
      },
      body: JSON.stringify(payload),
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

        const parsed = JSON.parse(dataLine.slice(5).trim()) as {
          type: 'delta' | 'done' | 'error';
          content?: string;
          error?: string;
        };

        if (parsed.type === 'delta' && parsed.content) {
          fullReply += parsed.content;
          onDelta(parsed.content);
        }

        if (parsed.type === 'error') {
          throw new Error(parsed.error || 'Chat failed.');
        }

        if (parsed.type === 'done') {
          doneReceived = true;
        }
      }
    }

    if (!doneReceived) {
      throw new Error('Chat stream ended unexpectedly.');
    }

    return fullReply.trim();
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
  createExpressionTask(topicId: string) {
    return unwrap<LearningTask>(http.post(`/writing/scenarios/${topicId}`));
  },
  async streamScenarioChat(
    scenario: ScenarioData,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    message: string,
    onDelta: (chunk: string) => void,
  ) {
    const token = getStoredAccessToken();
    const response = await fetch('/api/writing/scenarios/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-access-token': token } : {}),
      },
      body: JSON.stringify({ scenario, history, message }),
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
  checkObjectives(
    scenario: ScenarioData,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) {
    return unwrap<{ completedObjectiveIds: string[] }>(
      http.post('/writing/scenarios/check-objectives', { scenario, history }),
    );
  },
  summarizeScenario(
    scenario: ScenarioData,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) {
    return unwrap<ScenarioSummary>(
      http.post('/writing/scenarios/summarize', { scenario, history }),
    );
  },
  polishUserMessages(
    scenario: ScenarioData,
    messages: string[],
  ) {
    return unwrap<{ results: PolishResult[] }>(
      http.post('/writing/scenarios/polish', { scenario, messages }),
    );
  },
};
