import { Router } from 'express';
import { z } from 'zod';
import { createChatWordPrompt } from '../prompts/chatWordPrompt.js';
import { createChatListeningSentencePrompt } from '../prompts/chatListeningSentencePrompt.js';
import { createGenerateQuizPrompt } from '../prompts/generateQuizPrompt.js';
import { createQuizQuestionChatPrompt } from '../prompts/quizQuestionChatPrompt.js';
import { createSearchWordPrompt } from '../prompts/searchWordPrompt.js';
import { suggestWords } from '../services/suggestionService.js';
import { audioFileExists, createAudioDataUrl, createOrUpdateAudioFile, deleteAudioFile, getMediaUrl } from '../services/audioService.js';
import { getCommonAudioUrl, hasCommonAudio } from '../services/commonAudioService.js';
import { buildCompoundAudio } from '../services/compoundAudioService.js';
import { askWordChat, generateQuiz, searchWord, streamWordChat } from '../services/openaiService.js';
import { ensureFillBlankMaskedSentence, ensureListeningMaskedSentence } from '../services/fillBlankService.js';
import { addListeningSentence, appendListeningChatHistory, applyListeningQuizResults, clearListeningChatHistory, createListeningGroup, createListeningQuizDraft, deleteListeningGroup, getListeningEntryById, listListeningEntries, listListeningGroups, pickListeningEntries, pickListeningEntriesByGroup, removeListeningSentence, rewardListeningFamiliarity, setListeningAudioFile, updateListeningNote } from '../services/listeningService.js';
import { addWord, applyQuizResults, appendChatHistory, clearChatHistory, getWordById, listVocabulary, removeWord, rewardVocabularyFamiliarity, setWordAudioFile, updateWordNote } from '../services/vocabularyService.js';
import { checkSentenceImage, getOrCreateSentenceImage } from '../services/imageService.js';
import { enqueueAutoImageGeneration } from '../services/autoImageService.js';
import { createQuizSession, getQuizSession, pickQuizEntries, submitQuizAnswer, updateQuizSession } from '../services/quizService.js';
import {
  createLearningTask,
  createMistakeReviewSession,
  clearFailedLearningTask,
  getLearningTask,
  listLearningTasks,
  listMistakeEntries,
  markLearningTaskFailed,
  markLearningTaskPending,
  markLearningTaskReady,
  removeLearningTaskByQuizSessionId,
  reconcileMistakesForCompletedSession,
  upsertMistakesFromSession,
} from '../services/taskService.js';
import { createId } from '../utils/id.js';
import { fail, ok } from '../utils/http.js';
import type { QuizBlank, QuizQuestion } from '../types/models.js';

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

const sentenceImageSchema = z.object({
  sentence: z.string().min(1),
  word: z.string().optional(),
  force: z.boolean().optional(),
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  response: z.string(),
});

const listeningSentenceSchema = z.object({
  sentence: z.string().min(1),
  groupId: z.string().optional(),
});

const listeningGroupSchema = z.object({
  name: z.string().min(1).max(100),
});

export const vocabularyRouter = Router();

type QuestionLike = {
  id?: string;
  type: 'fill_blank' | 'listening';
  word: string;
  sentence: string;
  maskedSentence?: string;
  answer: string;
  answerVariants?: string[];
  candidates?: string[];
  ttsText?: string;
  audioUrl?: string;
  imageUrl?: string;
  blanks?: QuizBlank[];
};

/**
 * Generate the per-question assets (listening TTS audio / fill-blank image)
 * without letting one failing question sink the whole task. Returns the
 * enriched question plus a success flag; failures keep the question's data
 * (word/sentence/answer) so Retry can back-fill just the missing asset.
 */
async function enrichQuestion(question: QuestionLike): Promise<{ question: QuestionLike; ok: boolean; error?: string }> {
  try {
    if (question.type === 'listening') {
      const normalized = await ensureListeningMaskedSentence(question);
      const audioUrl = normalized.ttsText
        ? await createAudioDataUrl(normalized.ttsText)
        : undefined;
      if (!audioUrl) {
        return { question, ok: false };
      }
      return { question: { ...normalized, audioUrl }, ok: true };
    }

    const normalized = await ensureFillBlankMaskedSentence(question);
    let imageUrl: string | undefined = question.imageUrl;
    if (!imageUrl) {
      try {
        const image = await getOrCreateSentenceImage(normalized.sentence, { word: normalized.word });
        imageUrl = image.imageUrl;
      } catch {
        // Image generation is best-effort; the question stays usable without it.
        imageUrl = undefined;
      }
    }
    return { question: { ...normalized, imageUrl }, ok: true };
  } catch (error) {
    return {
      question,
      ok: false,
      error: error instanceof Error ? error.message : 'Generation failed.',
    };
  }
}

async function generateVocabularyQuizSession() {
  const entries = pickQuizEntries(listVocabulary());
  if (entries.length === 0) {
    throw new Error('No vocabulary available for learning.');
  }

  const prompt = createGenerateQuizPrompt(entries);
  const result = await generateQuiz(prompt);
  let failedCount = 0;
  const questions: QuizQuestion[] = [];
  for (const draft of result.questions) {
    const { question, ok } = await enrichQuestion(draft);
    if (!ok) {
      failedCount += 1;
    }
    questions.push({ ...question, id: createId('question') });
  }

  return { session: createQuizSession(questions, 'vocabulary_task'), failedCount };
}

async function processVocabularyTask(taskId: string) {
  try {
    const { session, failedCount } = await generateVocabularyQuizSession();
    if (failedCount > 0) {
      // Stash the partially generated session — successful questions are reused
      // on Retry, which only back-fills the ones that are still missing audio.
      markLearningTaskFailed(
        taskId,
        `${session.questions.length - failedCount}/${session.questions.length} questions ready — ${failedCount} still missing audio. Click Retry to finish them.`,
        { quizSessionId: session.id },
      );
      return;
    }

    markLearningTaskReady(taskId, {
      quizSessionId: session.id,
      questionCount: session.questions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz generation failed.';
    markLearningTaskFailed(taskId, message);
  }
}

async function generateListeningQuizSession(groupId?: string) {
  const entries = groupId
    ? pickListeningEntriesByGroup(groupId)
    : pickListeningEntries(listListeningEntries());
  if (entries.length === 0) {
    throw new Error('No listening sentences available for learning.');
  }

  let failedCount = 0;
  const questions: QuizQuestion[] = [];
  for (const entry of entries) {
    try {
      const draft = createListeningQuizDraft(entry);
      const audioUrl = draft.ttsText ? await createAudioDataUrl(draft.ttsText) : undefined;
      if (!audioUrl) {
        failedCount += 1;
      }
      questions.push({ ...draft, id: createId('question'), audioUrl });
    } catch {
      failedCount += 1;
      const draft = createListeningQuizDraft(entry);
      questions.push({ ...draft, id: createId('question') });
    }
  }

  return { session: createQuizSession(questions, 'listening_task'), failedCount };
}

async function processListeningTask(taskId: string, groupId?: string) {
  try {
    const { session, failedCount } = await generateListeningQuizSession(groupId);
    if (failedCount > 0) {
      markLearningTaskFailed(
        taskId,
        `${session.questions.length - failedCount}/${session.questions.length} sentences ready — ${failedCount} still missing audio. Click Retry to finish them.`,
        { quizSessionId: session.id },
      );
      return;
    }

    markLearningTaskReady(taskId, {
      quizSessionId: session.id,
      questionCount: session.questions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Listening quiz generation failed.';
    markLearningTaskFailed(taskId, message);
  }
}

/**
 * Back-fill the assets for questions that failed earlier, reusing the ones
 * that are already ready. Runs in the background after the user clicks Retry.
 */
async function processTaskRetry(taskId: string) {
  const task = getLearningTask(taskId);
  if (!task?.quizSessionId) {
    markLearningTaskFailed(taskId, 'No stashed session found. Delete this task and create a new one.');
    return;
  }

  const session = getQuizSession(task.quizSessionId);
  if (!session) {
    markLearningTaskFailed(taskId, 'Stashed quiz session is gone. Delete this task and create a new one.');
    return;
  }

  let failedCount = 0;
  const questions: QuizQuestion[] = [];
  for (const question of session.questions) {
    const needsAudio = question.type === 'listening' && !question.audioUrl;
    const needsImage = question.type === 'fill_blank' && !question.imageUrl;
    if (!needsAudio && !needsImage) {
      questions.push(question);
      continue;
    }

    const { question: enriched, ok } = await enrichQuestion(question);
    if (!ok && enriched.type === 'listening') {
      failedCount += 1;
    }
    questions.push({ ...enriched, id: question.id });
  }
  updateQuizSession({ ...session, questions });

  if (failedCount === 0) {
    markLearningTaskReady(taskId, {
      quizSessionId: session.id,
      questionCount: questions.length,
    });
    return;
  }

  markLearningTaskFailed(
    taskId,
    `${questions.length - failedCount}/${questions.length} questions ready — ${failedCount} still missing audio. Click Retry to try again.`,
    { quizSessionId: session.id },
  );
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

vocabularyRouter.get('/listening/groups', (_req, res) => ok(res, listListeningGroups()));

vocabularyRouter.post('/listening/groups', (req, res) => {
  const parsed = listeningGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Group name is required.');
  }

  try {
    const data = createListeningGroup(parsed.data.name);
    return ok(res, data);
  } catch (error) {
    return fail(res, 400, error instanceof Error ? error.message : 'Failed to create group.');
  }
});

vocabularyRouter.post('/listening/groups/:id/delete', (req, res) => {
  const removed = deleteListeningGroup(req.params.id);
  if (!removed) {
    return fail(res, 404, 'Group not found or cannot be deleted.');
  }

  return ok(res, { removed: true });
});

vocabularyRouter.get('/listening', (req, res) => {
  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
  return ok(res, listListeningEntries(groupId));
});

vocabularyRouter.post('/listening', (req, res) => {
  const parsed = listeningSentenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Sentence is required.');
  }

  const data = addListeningSentence(parsed.data.sentence, parsed.data.groupId);
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

vocabularyRouter.post('/tasks/listening/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  const entries = pickListeningEntriesByGroup(groupId);
  if (entries.length === 0) {
    return fail(res, 400, 'No listening sentences available in this group for learning.');
  }

  const task = createLearningTask('listening');
  void processListeningTask(task.id, groupId);
  return ok(res, task);
});

vocabularyRouter.post('/tasks/mistakes/start', async (_req, res) => {
  const session = await createMistakeReviewSession();
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

vocabularyRouter.post('/tasks/:id/retry', (req, res) => {
  const task = getLearningTask(req.params.id);
  if (!task) {
    return fail(res, 404, 'Task not found.');
  }

  if (task.status !== 'failed' || !task.quizSessionId) {
    return fail(res, 400, 'Only failed tasks with retained questions can be retried.');
  }

  markLearningTaskPending(task.id);
  void processTaskRetry(task.id);
  return ok(res, getLearningTask(task.id));
});

vocabularyRouter.get('/common-audio', async (req, res) => {
  const word = typeof req.query.word === 'string' ? req.query.word : '';
  if (!word.trim()) {
    return ok(res, { hasCommon: false, audioUrl: null });
  }

  // 1) exact common clip, 2) spliced compound audio, 3) nothing → TTS at play time.
  if (hasCommonAudio(word)) {
    return ok(res, { hasCommon: true, audioUrl: getCommonAudioUrl(word) });
  }

  try {
    const compoundUrl = await buildCompoundAudio(word);
    if (compoundUrl) {
      return ok(res, { hasCommon: false, audioUrl: compoundUrl });
    }
  } catch {
    // Splicing failed; fall through to TTS.
  }

  return ok(res, { hasCommon: false, audioUrl: null });
});

vocabularyRouter.get('/suggest', (req, res) => {
  const prefix = typeof req.query.query === 'string' ? req.query.query : '';
  const limitParam = Number(req.query.limit);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 20) : 8;
  return ok(res, { suggestions: suggestWords(prefix, limit), query: prefix });
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
  if (response.created) {
    // Auto Generation setting: queue example-sentence images in background.
    void enqueueAutoImageGeneration(response.entry);
  }
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
    if (force && entry.audioFile && audioFileExists(entry.audioFile)) {
      deleteAudioFile(entry.audioFile);
    }

    if (!force && entry.audioFile && audioFileExists(entry.audioFile)) {
      return ok(res, { audioUrl: getMediaUrl(fileName), audioFile: fileName });
    }

    // Prefer offline audio: exact common clip, then spliced compound audio.
    // TTS is the last resort (per the common → compound → tts chain).
    if (hasCommonAudio(entry.ttsText)) {
      return ok(res, { audioUrl: getCommonAudioUrl(entry.ttsText), audioFile: null });
    }
    const compoundUrl = await buildCompoundAudio(entry.ttsText);
    if (compoundUrl) {
      return ok(res, { audioUrl: compoundUrl, audioFile: null });
    }

    await createOrUpdateAudioFile(fileName, entry.ttsText);
    setWordAudioFile(entry.id, fileName);
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

vocabularyRouter.post('/check-image', (req, res) => {
  const parsed = sentenceImageSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Sentence is required.');
  }

  const result = checkSentenceImage(parsed.data.sentence);
  return ok(res, { imageUrl: result?.imageUrl ?? null });
});

vocabularyRouter.post('/generate-image', async (req, res) => {
  const parsed = sentenceImageSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Sentence is required.');
  }

  try {
    const result = await getOrCreateSentenceImage(parsed.data.sentence, {
      word: parsed.data.word,
      force: parsed.data.force,
    });
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Image generation failed.');
  }
});

vocabularyRouter.post('/generate-quiz', async (_req, res) => {
  try {
    const { session, failedCount } = await generateVocabularyQuizSession();
    if (failedCount > 0) {
      return fail(res, 500, `${failedCount} question(s) failed to generate audio.`);
    }

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

const quizQuestionChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  word: z.string().min(1),
  sentence: z.string().min(1),
  type: z.enum(['fill_blank', 'listening']),
  answer: z.string().min(1),
  userResponse: z.string(),
  isCorrect: z.boolean(),
  newMessage: z.string().min(1),
});

vocabularyRouter.post('/quiz/question-chat/stream', async (req, res) => {
  const parsed = quizQuestionChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid chat payload.');
  }

  const { messages, word, sentence, type, answer, userResponse, isCorrect, newMessage } = parsed.data;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const prompt = createQuizQuestionChatPrompt(
      { word, sentence, type, answer, userResponse, isCorrect },
      messages,
      newMessage,
    );

    const reply = await streamWordChat(prompt, (chunk) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
      }
    });

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (!res.writableEnded) {
      const message = error instanceof Error ? error.message : 'Chat failed.';
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
      res.end();
    }
  }
});
