import { Router } from 'express';
import { z } from 'zod';
import { createChatWordPrompt } from '../prompts/chatWordPrompt.js';
import { createChatListeningSentencePrompt } from '../prompts/chatListeningSentencePrompt.js';
import { createGenerateQuizPrompt } from '../prompts/generateQuizPrompt.js';
import { createSearchWordPrompt } from '../prompts/searchWordPrompt.js';
import { audioFileExists, createAudioDataUrl, createOrUpdateAudioFile, deleteAudioFile, getMediaUrl } from '../services/audioService.js';
import { askWordChat, generateQuiz, searchWord, streamWordChat } from '../services/openaiService.js';
import { ensureFillBlankMaskedSentence, ensureListeningMaskedSentence } from '../services/fillBlankService.js';
import { addListeningSentence, appendListeningChatHistory, applyListeningQuizResults, clearListeningChatHistory, createListeningQuizDraft, getListeningEntryById, listListeningEntries, pickListeningEntries, removeListeningSentence, rewardListeningFamiliarity, setListeningAudioFile, updateListeningNote } from '../services/listeningService.js';
import { addWord, applyQuizResults, appendChatHistory, clearChatHistory, getWordById, listVocabulary, removeWord, rewardVocabularyFamiliarity, setWordAudioFile, updateWordNote } from '../services/vocabularyService.js';
import { createQuizSession, getQuizSession, pickQuizEntries, submitQuizAnswer } from '../services/quizService.js';
import {
  createLearningTask,
  createMistakeReviewSession,
  clearFailedLearningTask,
  getLearningTask,
  listLearningTasks,
  listMistakeEntries,
  markLearningTaskFailed,
  markLearningTaskReady,
  removeLearningTaskByQuizSessionId,
  reconcileMistakesForCompletedSession,
  upsertMistakesFromSession,
} from '../services/taskService.js';
import { createId } from '../utils/id.js';
import { fail, ok } from '../utils/http.js';

const searchSchema = z.object({
  query: z.string().min(1),
});

const saveSchema = z.object({
  result: z.object({
    text: z.string().min(1),
    type: z.enum(['word', 'phrase']),
    found: z.literal(true),
    pronunciation: z.string().min(1),
    meanings: z.array(z.object({
      partOfSpeech: z.string().min(1),
      englishMeaning: z.string().min(1),
      chineseMeaning: z.string().min(1),
      example: z.string().min(1),
      exampleTranslation: z.string().min(1),
    })).min(1),
    derivatives: z.array(z.string()),
    ttsText: z.string().min(1),
    notFoundMessage: z.string().optional(),
  }),
});

const noteSchema = z.object({
  note: z.string(),
});

const chatSchema = z.object({
  message: z.string().min(1),
});

const audioSchema = z.object({
  input: z.string().min(1),
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  response: z.string(),
});

const listeningSentenceSchema = z.object({
  sentence: z.string().min(1),
});

export const vocabularyRouter = Router();

async function generateVocabularyQuizSession() {
  const entries = pickQuizEntries(listVocabulary());
  if (entries.length === 0) {
    throw new Error('No vocabulary available for learning.');
  }

  const prompt = createGenerateQuizPrompt(entries);
  const result = await generateQuiz(prompt);
  const normalizedQuestions = await Promise.all(result.questions.map(async (question) => {
    if (question.type === 'fill_blank') {
      return ensureFillBlankMaskedSentence(question);
    }

    if (question.type === 'listening') {
      return ensureListeningMaskedSentence(question);
    }

    return question;
  }));
  const questions = await Promise.all(normalizedQuestions.map(async (question) => {
    const audioUrl = question.type === 'listening' && question.ttsText
      ? await createAudioDataUrl(question.ttsText)
      : undefined;

    return {
      ...question,
      id: createId('question'),
      audioUrl,
    };
  }));

  return createQuizSession(questions, 'vocabulary_task');
}

async function processVocabularyTask(taskId: string) {
  try {
    const session = await generateVocabularyQuizSession();
    markLearningTaskReady(taskId, {
      quizSessionId: session.id,
      questionCount: session.questions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz generation failed.';
    markLearningTaskFailed(taskId, message);
  }
}

async function generateListeningQuizSession() {
  const entries = pickListeningEntries(listListeningEntries());
  if (entries.length === 0) {
    throw new Error('No listening sentences available for learning.');
  }

  const questions = await Promise.all(entries.map(async (entry) => {
    const draft = createListeningQuizDraft(entry);
    const audioUrl = await createAudioDataUrl(draft.ttsText ?? draft.sentence);

    return {
      ...draft,
      id: createId('question'),
      audioUrl,
    };
  }));

  return createQuizSession(questions, 'listening_task');
}

async function processListeningTask(taskId: string) {
  try {
    const session = await generateListeningQuizSession();
    markLearningTaskReady(taskId, {
      quizSessionId: session.id,
      questionCount: session.questions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Listening quiz generation failed.';
    markLearningTaskFailed(taskId, message);
  }
}

vocabularyRouter.get('/', (_req, res) => ok(res, listVocabulary()));

vocabularyRouter.get('/quiz/:id', (req, res) => {
  const session = getQuizSession(req.params.id);
  if (!session) {
    return fail(res, 404, 'Quiz session not found.');
  }

  return ok(res, session);
});

vocabularyRouter.get('/tasks', (_req, res) => ok(res, {
  tasks: listLearningTasks(),
  mistakes: listMistakeEntries(),
}));

vocabularyRouter.get('/listening', (_req, res) => ok(res, listListeningEntries()));

vocabularyRouter.post('/listening', (req, res) => {
  const parsed = listeningSentenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Sentence is required.');
  }

  const data = addListeningSentence(parsed.data.sentence);
  return ok(res, data);
});

vocabularyRouter.post('/listening/:id/delete', (req, res) => {
  const removed = removeListeningSentence(req.params.id);
  if (!removed) {
    return fail(res, 404, 'Listening sentence not found.');
  }

  return ok(res, { removed: true });
});

vocabularyRouter.post('/listening/:id/audio', async (req, res) => {
  const entry = getListeningEntryById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Listening sentence not found.');
  }

  const force = req.body?.force === true;
  const fileName = entry.audioFile ?? `listening-${entry.id}.mp3`;
  try {
    if (force || !entry.audioFile || !audioFileExists(entry.audioFile)) {
      if (force && entry.audioFile && audioFileExists(entry.audioFile)) {
        deleteAudioFile(entry.audioFile);
      }
      await createOrUpdateAudioFile(fileName, entry.sentence);
      setListeningAudioFile(entry.id, fileName);
    }

    return ok(res, { audioUrl: getMediaUrl(fileName), audioFile: fileName });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Audio generation failed.');
  }
});

vocabularyRouter.post('/listening/:id/note', (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid note.');
  }

  const updated = updateListeningNote(req.params.id, parsed.data.note);
  if (!updated) {
    return fail(res, 404, 'Listening sentence not found.');
  }

  return ok(res, updated);
});

vocabularyRouter.post('/listening/:id/chat-word', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const entry = getListeningEntryById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Listening sentence not found.');
  }

  appendListeningChatHistory(entry.id, 'user', parsed.data.message);

  try {
    const refreshedEntry = getListeningEntryById(entry.id);
    if (!refreshedEntry) {
      return fail(res, 404, 'Listening sentence not found.');
    }

    const prompt = createChatListeningSentencePrompt(refreshedEntry, refreshedEntry.chatHistory, parsed.data.message);
    const reply = await askWordChat(prompt);
    const updated = appendListeningChatHistory(entry.id, 'assistant', reply);
    return ok(res, { reply, entry: updated });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Chat failed.');
  }
});

vocabularyRouter.post('/listening/:id/chat-word/stream', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const entry = getListeningEntryById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Listening sentence not found.');
  }

  appendListeningChatHistory(entry.id, 'user', parsed.data.message);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const refreshedEntry = getListeningEntryById(entry.id);
    if (!refreshedEntry) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Listening sentence not found.' })}\n\n`);
      res.end();
      return;
    }

    const prompt = createChatListeningSentencePrompt(refreshedEntry, refreshedEntry.chatHistory, parsed.data.message);
    const reply = await streamWordChat(prompt, (chunk) => {
      if (res.writableEnded) {
        return;
      }

      res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
    });

    appendListeningChatHistory(entry.id, 'assistant', reply);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed.';
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

vocabularyRouter.post('/listening/:id/chat-word/clear', (req, res) => {
  const updated = clearListeningChatHistory(req.params.id);
  if (!updated) {
    return fail(res, 404, 'Listening sentence not found.');
  }

  return ok(res, updated);
});

vocabularyRouter.post('/tasks/vocabulary', (_req, res) => {
  const entries = pickQuizEntries(listVocabulary());
  if (entries.length === 0) {
    return fail(res, 400, 'No vocabulary available for learning.');
  }

  const task = createLearningTask('vocabulary');
  void processVocabularyTask(task.id);
  return ok(res, task);
});

vocabularyRouter.post('/tasks/listening', (_req, res) => {
  const entries = pickListeningEntries(listListeningEntries());
  if (entries.length === 0) {
    return fail(res, 400, 'No listening sentences available for learning.');
  }

  const task = createLearningTask('listening');
  void processListeningTask(task.id);
  return ok(res, task);
});

vocabularyRouter.post('/tasks/mistakes/start', (_req, res) => {
  const session = createMistakeReviewSession();
  if (!session) {
    return fail(res, 400, 'No mistakes available.');
  }

  return ok(res, { sessionId: session.id });
});

vocabularyRouter.post('/tasks/:id/start', (req, res) => {
  const task = getLearningTask(req.params.id);
  if (!task) {
    return fail(res, 404, 'Task not found.');
  }

  if (task.status !== 'ready' || !task.quizSessionId) {
    return fail(res, 400, 'Task is not ready yet.');
  }

  return ok(res, { sessionId: task.quizSessionId });
});

vocabularyRouter.post('/tasks/:id/clear', (req, res) => {
  const result = clearFailedLearningTask(req.params.id);
  if (!result.ok) {
    return fail(res, 404, 'Task not found.');
  }

  return ok(res, { removed: true });
});

vocabularyRouter.post('/search-word', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Query is required.');
  }

  try {
    const prompt = createSearchWordPrompt(parsed.data.query.trim());
    const result = await searchWord(prompt);
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Search failed.');
  }
});

vocabularyRouter.post('/', (req, res) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid vocabulary payload.');
  }

  const response = addWord(parsed.data.result);
  return ok(res, response);
});

vocabularyRouter.get('/:id', (req, res) => {
  const entry = getWordById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Word not found.');
  }

  return ok(res, entry);
});

vocabularyRouter.post('/:id/note', (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid note.');
  }

  const updated = updateWordNote(req.params.id, parsed.data.note);
  if (!updated) {
    return fail(res, 404, 'Word not found.');
  }

  return ok(res, updated);
});

vocabularyRouter.post('/:id/delete', (req, res) => {
  const removed = removeWord(req.params.id);
  if (!removed) {
    return fail(res, 404, 'Word not found.');
  }

  return ok(res, { removed: true });
});

vocabularyRouter.post('/:id/audio', async (req, res) => {
  const entry = getWordById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Word not found.');
  }

  const force = req.body?.force === true;
  const fileName = entry.audioFile ?? `word-${entry.id}.mp3`;
  try {
    if (force || !entry.audioFile || !audioFileExists(entry.audioFile)) {
      if (force && entry.audioFile && audioFileExists(entry.audioFile)) {
        deleteAudioFile(entry.audioFile);
      }
      await createOrUpdateAudioFile(fileName, entry.ttsText);
      setWordAudioFile(entry.id, fileName);
    }

    return ok(res, { audioUrl: getMediaUrl(fileName), audioFile: fileName });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Audio generation failed.');
  }
});

vocabularyRouter.post('/:id/chat-word', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const entry = getWordById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Word not found.');
  }

  appendChatHistory(entry.id, 'user', parsed.data.message);

  try {
    const refreshedEntry = getWordById(entry.id);
    if (!refreshedEntry) {
      return fail(res, 404, 'Word not found.');
    }

    const prompt = createChatWordPrompt(refreshedEntry, refreshedEntry.chatHistory, parsed.data.message);
    const reply = await askWordChat(prompt);
    const updated = appendChatHistory(entry.id, 'assistant', reply);
    return ok(res, { reply, entry: updated });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Chat failed.');
  }
});

vocabularyRouter.post('/:id/chat-word/stream', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Message is required.');
  }

  const entry = getWordById(req.params.id);
  if (!entry) {
    return fail(res, 404, 'Word not found.');
  }

  appendChatHistory(entry.id, 'user', parsed.data.message);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const refreshedEntry = getWordById(entry.id);
    if (!refreshedEntry) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Word not found.' })}\n\n`);
      res.end();
      return;
    }

    const prompt = createChatWordPrompt(refreshedEntry, refreshedEntry.chatHistory, parsed.data.message);
    const reply = await streamWordChat(prompt, (chunk) => {
      if (res.writableEnded) {
        return;
      }

      res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
    });

    appendChatHistory(entry.id, 'assistant', reply);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed.';
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

vocabularyRouter.post('/:id/chat-word/clear', (req, res) => {
  const updated = clearChatHistory(req.params.id);
  if (!updated) {
    return fail(res, 404, 'Word not found.');
  }

  return ok(res, updated);
});

vocabularyRouter.post('/generate-audio', async (req, res) => {
  const parsed = audioSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Input is required.');
  }

  const force = req.body?.force === true;
  try {
    const audioUrl = await createAudioDataUrl(parsed.data.input, force);
    return ok(res, { audioUrl });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Audio generation failed.');
  }
});

vocabularyRouter.post('/generate-quiz', async (_req, res) => {
  try {
    const session = await generateVocabularyQuizSession();
    return ok(res, session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz generation failed.';
    if (message === 'No vocabulary available for learning.') {
      return fail(res, 400, message);
    }

    return fail(res, 500, message);
  }
});

vocabularyRouter.post('/quiz/:id/answer', (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid answer payload.');
  }

  const updated = submitQuizAnswer(req.params.id, parsed.data);
  if (!updated) {
    return fail(res, 404, 'Quiz session not found.');
  }

  if (updated.completed) {
    if (updated.sourceType === 'vocabulary_task' || updated.sourceType === 'listening_task') {
      removeLearningTaskByQuizSessionId(updated.id);
    }
    upsertMistakesFromSession(updated);
    reconcileMistakesForCompletedSession(updated);
    if (updated.sourceType === 'vocabulary_task') {
      const answerMap = new Map(updated.questions.map((question) => [question.id, question.word]));
      const vocabulary = applyQuizResults(updated.answers.map((item) => ({
        word: answerMap.get(item.questionId) ?? '',
        isCorrect: item.isCorrect,
      })));
      return ok(res, { session: updated, vocabulary });
    }

    if (updated.sourceType === 'listening_task') {
      const answerMap = new Map(updated.questions.map((question) => [question.id, question.sentence]));
      const listening = applyListeningQuizResults(updated.answers.map((item) => ({
        sentence: answerMap.get(item.questionId) ?? '',
        isCorrect: item.isCorrect,
      })));
      return ok(res, { session: updated, listening });
    }

    if (updated.sourceType === 'mistake_review') {
      const solvedQuestions = updated.answers
        .filter((item) => item.isCorrect)
        .map((item) => updated.questions.find((question) => question.id === item.questionId))
        .filter((question): question is (typeof updated.questions)[number] => Boolean(question));

      const vocabulary = rewardVocabularyFamiliarity(
        solvedQuestions
          .filter((question) => question.type === 'fill_blank')
          .map((question) => question.word),
      );
      const listening = rewardListeningFamiliarity(
        solvedQuestions
          .filter((question) => question.type === 'listening')
          .map((question) => question.sentence),
      );

      return ok(res, { session: updated, vocabulary, listening });
    }

    return ok(res, { session: updated });
  }

  return ok(res, { session: updated });
});
