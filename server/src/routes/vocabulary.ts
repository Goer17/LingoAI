import { Router } from 'express';
import { z } from 'zod';
import { createChatWordPrompt } from '../prompts/chatWordPrompt.js';
import { createGenerateQuizPrompt } from '../prompts/generateQuizPrompt.js';
import { createSearchWordPrompt } from '../prompts/searchWordPrompt.js';
import { createAudioDataUrl } from '../services/audioService.js';
import { askWordChat, generateQuiz, searchWord } from '../services/openaiService.js';
import { addWord, applyQuizResults, appendChatHistory, clearChatHistory, getWordById, listVocabulary, updateWordNote } from '../services/vocabularyService.js';
import { createQuizSession, getQuizSession, pickQuizEntries, submitQuizAnswer } from '../services/quizService.js';
import { createId } from '../utils/id.js';
import { fail, ok } from '../utils/http.js';

const searchSchema = z.object({
  query: z.string().min(1),
});

const saveSchema = z.object({
  result: z.object({
    text: z.string().min(1),
    type: z.enum(['word', 'phrase']),
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

export const vocabularyRouter = Router();

vocabularyRouter.get('/', (_req, res) => ok(res, listVocabulary()));

vocabularyRouter.get('/quiz/:id', (req, res) => {
  const session = getQuizSession(req.params.id);
  if (!session) {
    return fail(res, 404, 'Quiz session not found.');
  }

  return ok(res, session);
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

  try {
    const audioUrl = await createAudioDataUrl(parsed.data.input);
    return ok(res, { audioUrl });
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Audio generation failed.');
  }
});

vocabularyRouter.post('/generate-quiz', async (_req, res) => {
  const entries = pickQuizEntries(listVocabulary());
  if (entries.length === 0) {
    return fail(res, 400, 'No vocabulary available for learning.');
  }

  try {
    const prompt = createGenerateQuizPrompt(entries);
    const result = await generateQuiz(prompt);
    const questions = await Promise.all(result.questions.map(async (question) => {
      const audioUrl = question.type === 'listening' && question.ttsText
        ? await createAudioDataUrl(question.ttsText)
        : undefined;

      return {
        ...question,
        id: createId('question'),
        audioUrl,
      };
    }));

    const session = createQuizSession(questions);
    return ok(res, session);
  } catch (error) {
    return fail(res, 500, error instanceof Error ? error.message : 'Quiz generation failed.');
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
    const answerMap = new Map(updated.questions.map((question) => [question.id, question.word]));
    const vocabulary = applyQuizResults(updated.answers.map((item) => ({
      word: answerMap.get(item.questionId) ?? '',
      isCorrect: item.isCorrect,
    })));
    return ok(res, { session: updated, vocabulary });
  }

  return ok(res, { session: updated });
});
