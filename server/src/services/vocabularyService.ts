import { vocabularyRepository } from '../db/repositories.js';
import { createId } from '../utils/id.js';
import type { SearchResult, VocabularyEntry } from '../types/models.js';
import { deleteAudioFile } from './audioService.js';

export function listVocabulary() {
  return vocabularyRepository.list();
}

export function getWordById(id: string) {
  return vocabularyRepository.getById(id);
}

export function findWordByText(text: string) {
  return vocabularyRepository.getByNormalizedText(text.trim().toLowerCase());
}

export function addWord(result: SearchResult) {
  const existing = findWordByText(result.text);
  if (existing) {
    return { created: false as const, entry: existing };
  }

  const now = new Date().toISOString();
  const entry: VocabularyEntry = {
    id: createId('word'),
    text: result.text,
    type: result.type,
    familiarity: 0,
    createdAt: now,
    updatedAt: now,
    note: '',
    pronunciation: result.pronunciation,
    meanings: result.meanings,
    derivatives: result.derivatives,
    ttsText: result.ttsText,
    audioFile: undefined,
    chatHistory: [],
  };

  vocabularyRepository.save(entry);
  return { created: true as const, entry };
}

export function updateWordNote(id: string, note: string) {
  const current = getWordById(id);
  if (!current) {
    return null;
  }

  const updated: VocabularyEntry = {
    ...current,
    note,
    updatedAt: new Date().toISOString(),
  };

  vocabularyRepository.save(updated);
  return updated;
}

export function appendChatHistory(id: string, role: 'user' | 'assistant', content: string) {
  const current = getWordById(id);
  if (!current) {
    return null;
  }

  const updated: VocabularyEntry = {
    ...current,
    updatedAt: new Date().toISOString(),
    chatHistory: [
      ...current.chatHistory,
      {
        id: createId('chat'),
        role,
        content,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  vocabularyRepository.save(updated);
  return updated;
}

export function clearChatHistory(id: string) {
  const current = getWordById(id);
  if (!current) {
    return null;
  }

  const updated: VocabularyEntry = {
    ...current,
    updatedAt: new Date().toISOString(),
    chatHistory: [],
  };

  vocabularyRepository.save(updated);
  return updated;
}

export function applyQuizResults(results: Array<{ word: string; isCorrect: boolean }>) {
  const resultMap = new Map(results.map((item) => [item.word.toLowerCase(), item.isCorrect]));

  for (const item of vocabularyRepository.list()) {
    const isCorrect = resultMap.get(item.text.toLowerCase());
    if (typeof isCorrect !== 'boolean') {
      continue;
    }

    const familiarity = isCorrect
      ? item.familiarity + 1
      : Math.max(0, item.familiarity - 1);

    if (familiarity > 10) {
      removeWord(item.id);
      continue;
    }

    vocabularyRepository.save({
      ...item,
      familiarity,
      updatedAt: new Date().toISOString(),
    });
  }

  return vocabularyRepository.list();
}

export function setWordAudioFile(id: string, audioFile: string) {
  const current = getWordById(id);
  if (!current) {
    return null;
  }

  const updated: VocabularyEntry = {
    ...current,
    audioFile,
    updatedAt: new Date().toISOString(),
  };
  vocabularyRepository.save(updated);
  return updated;
}

export function removeWord(id: string) {
  const current = getWordById(id);
  if (!current) {
    return false;
  }

  deleteAudioFile(current.audioFile);
  vocabularyRepository.remove(id);
  return true;
}

export function rewardVocabularyFamiliarity(words: string[]) {
  if (words.length === 0) {
    return vocabularyRepository.list();
  }

  const targetSet = new Set(words.map((item) => item.trim().toLowerCase()).filter(Boolean));
  for (const item of vocabularyRepository.list()) {
    if (!targetSet.has(item.text.trim().toLowerCase())) {
      continue;
    }

    const familiarity = item.familiarity + 1;
    if (familiarity > 10) {
      removeWord(item.id);
      continue;
    }

    vocabularyRepository.save({
      ...item,
      familiarity,
      updatedAt: new Date().toISOString(),
    });
  }

  return vocabularyRepository.list();
}
