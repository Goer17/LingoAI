import { listeningRepository } from '../db/repositories.js';
import type { ListeningEntry, QuizDraftQuestion } from '../types/models.js';
import { createId } from '../utils/id.js';
import { deleteAudioFile } from './audioService.js';

function normalizeSentence(sentence: string) {
  return sentence.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function listListeningEntries() {
  return listeningRepository.list();
}

export function getListeningEntryById(id: string) {
  return listeningRepository.getById(id);
}

export function addListeningSentence(sentence: string) {
  const normalized = normalizeSentence(sentence);
  const existing = listeningRepository.getByNormalizedSentence(normalized);
  if (existing) {
    return { created: false as const, entry: existing };
  }

  const now = new Date().toISOString();
  const entry: ListeningEntry = {
    id: createId('listen'),
    sentence: sentence.trim().replace(/\s+/g, ' '),
    familiarity: 0,
    createdAt: now,
    updatedAt: now,
    audioFile: undefined,
  };

  listeningRepository.save(entry);
  return { created: true as const, entry };
}

export function removeListeningSentence(id: string) {
  const existing = getListeningEntryById(id);
  if (!existing) {
    return false;
  }

  deleteAudioFile(existing.audioFile);
  listeningRepository.remove(id);
  return true;
}

export function pickListeningEntries(entries: ListeningEntry[]) {
  return entries
    .slice()
    .sort((a, b) => a.familiarity - b.familiarity || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);
}

export function applyListeningQuizResults(results: Array<{ sentence: string; isCorrect: boolean }>) {
  const resultMap = new Map(results.map((item) => [item.sentence.toLowerCase(), item.isCorrect]));

  for (const item of listeningRepository.list()) {
    const isCorrect = resultMap.get(item.sentence.toLowerCase());
    if (typeof isCorrect !== 'boolean') {
      continue;
    }

    const familiarity = isCorrect
      ? item.familiarity + 1
      : Math.max(0, item.familiarity - 1);

    if (familiarity > 20) {
      deleteAudioFile(item.audioFile);
      listeningRepository.remove(item.id);
      continue;
    }

    listeningRepository.save({
      ...item,
      familiarity,
      updatedAt: new Date().toISOString(),
    });
  }

  return listeningRepository.list();
}

export function setListeningAudioFile(id: string, audioFile: string) {
  const current = getListeningEntryById(id);
  if (!current) {
    return null;
  }

  const updated: ListeningEntry = {
    ...current,
    audioFile,
    updatedAt: new Date().toISOString(),
  };
  listeningRepository.save(updated);
  return updated;
}

type WordMatch = {
  text: string;
  index: number;
  end: number;
};

function collectWords(sentence: string) {
  const matches = sentence.matchAll(/[A-Za-z']+/g);
  const words: WordMatch[] = [];
  for (const match of matches) {
    const text = match[0];
    const index = match.index;
    if (typeof index === 'number') {
      words.push({ text, index, end: index + text.length });
    }
  }
  return words;
}

function pickBlankRatio(familiarity: number) {
  if (familiarity >= 20) {
    return 1;
  }

  return 0.15 + (familiarity / 20) * 0.75;
}

export function createListeningQuizDraft(entry: ListeningEntry): QuizDraftQuestion {
  const sentence = entry.sentence;
  const words = collectWords(sentence);
  if (words.length === 0 || entry.familiarity >= 20) {
    return {
      type: 'listening',
      word: sentence,
      sentence,
      answer: sentence,
      ttsText: sentence,
      blanks: words.map((word) => ({
        start: word.index,
        end: word.end,
        answer: word.text,
      })),
    };
  }

  const ratio = pickBlankRatio(entry.familiarity);
  const blankWordCount = Math.max(1, Math.min(words.length, Math.round(words.length * ratio)));
  const shuffled = words
    .map((word, idx) => ({ word, idx }))
    .sort(() => Math.random() - 0.5)
    .slice(0, blankWordCount)
    .sort((a, b) => a.idx - b.idx)
    .map((item) => item.word);

  return {
    type: 'listening',
    word: sentence,
    sentence,
    answer: sentence,
    ttsText: sentence,
    blanks: shuffled.map((word) => ({
      start: word.index,
      end: word.end,
      answer: word.text,
    })),
  };
}
