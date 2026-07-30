import { listeningRepository, listeningGroupRepository } from '../db/repositories.js';
import type { ChatMessage, ListeningEntry, ListeningGroup, QuizDraftQuestion } from '../types/models.js';
import { createId } from '../utils/id.js';
import { deleteAudioFile } from './audioService.js';

const DEFAULT_GROUP_NAME = 'Default';

function ensureDefaultGroup(): ListeningGroup {
  const existing = listeningGroupRepository.list();
  const defaultGroup = existing.find((g) => g.name === DEFAULT_GROUP_NAME);
  if (defaultGroup) {
    return defaultGroup;
  }

  const now = new Date().toISOString();
  const group: ListeningGroup = {
    id: createId('lgroup'),
    name: DEFAULT_GROUP_NAME,
    createdAt: now,
    updatedAt: now,
  };
  listeningGroupRepository.save(group);
  return group;
}

function getDefaultGroupId(): string {
  return ensureDefaultGroup().id;
}

function normalizeEntryGroupId(entry: ListeningEntry): ListeningEntry {
  if (entry.groupId) {
    return entry;
  }

  const updated = { ...entry, groupId: getDefaultGroupId() };
  listeningRepository.save(updated);
  return updated;
}

function normalizeSentence(sentence: string) {
  return sentence.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeListeningEntry(entry: ListeningEntry): ListeningEntry {
  const note = typeof entry.note === 'string' ? entry.note : '';
  const chatHistory = Array.isArray(entry.chatHistory) ? entry.chatHistory : [];
  const groupId = typeof entry.groupId === 'string' && entry.groupId ? entry.groupId : '';
  if (note === entry.note && chatHistory === entry.chatHistory && groupId === entry.groupId) {
    return entry;
  }

  return {
    ...entry,
    note,
    chatHistory,
    groupId,
  };
}

export function listListeningEntries(groupId?: string) {
  const all = listeningRepository.list().map((item) => {
    const normalized = normalizeListeningEntry(item);
    return normalizeEntryGroupId(normalized);
  });

  if (groupId) {
    return all.filter((entry) => entry.groupId === groupId);
  }

  return all;
}

export function listListeningGroups() {
  ensureDefaultGroup();
  return listeningGroupRepository.list();
}

export function getListeningEntryById(id: string) {
  const entry = listeningRepository.getById(id);
  if (!entry) {
    return null;
  }
  const normalized = normalizeListeningEntry(entry);
  return normalizeEntryGroupId(normalized);
}

export function createListeningGroup(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Group name is required.');
  }

  const existing = listeningGroupRepository.list().find(
    (g) => g.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) {
    return { created: false as const, group: existing };
  }

  const now = new Date().toISOString();
  const group: ListeningGroup = {
    id: createId('lgroup'),
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  listeningGroupRepository.save(group);
  return { created: true as const, group };
}

export function deleteListeningGroup(id: string) {
  const group = listeningGroupRepository.getById(id);
  if (!group) {
    return false;
  }

  if (group.name === DEFAULT_GROUP_NAME) {
    return false;
  }

  const defaultGroupId = getDefaultGroupId();
  const entries = listeningRepository.listByGroup(id);
  for (const entry of entries) {
    listeningRepository.save({ ...entry, groupId: defaultGroupId, updatedAt: new Date().toISOString() });
  }

  listeningGroupRepository.remove(id);
  return true;
}

export function addListeningSentence(sentence: string, groupId?: string) {
  const normalized = normalizeSentence(sentence);
  const existing = listeningRepository.getByNormalizedSentence(normalized);
  if (existing) {
    const resolved = normalizeEntryGroupId(normalizeListeningEntry(existing));
    return { created: false as const, entry: resolved };
  }

  const effectiveGroupId = groupId || getDefaultGroupId();
  const now = new Date().toISOString();
  const entry: ListeningEntry = {
    id: createId('listen'),
    sentence: sentence.trim().replace(/\s+/g, ' '),
    familiarity: 0,
    createdAt: now,
    updatedAt: now,
    audioFile: undefined,
    note: '',
    chatHistory: [],
    groupId: effectiveGroupId,
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

export function pickListeningEntriesByGroup(groupId: string) {
  const entries = listListeningEntries(groupId);
  return pickListeningEntries(entries);
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

    const entry = normalizeEntryGroupId(normalizeListeningEntry(item));

    listeningRepository.save({
      ...item,
      groupId: entry.groupId,
      familiarity,
      updatedAt: new Date().toISOString(),
    });
  }

  return listListeningEntries();
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

export function updateListeningNote(id: string, note: string) {
  const current = getListeningEntryById(id);
  if (!current) {
    return null;
  }

  const updated: ListeningEntry = {
    ...current,
    note,
    updatedAt: new Date().toISOString(),
  };
  listeningRepository.save(updated);
  return updated;
}

export function appendListeningChatHistory(id: string, role: ChatMessage['role'], content: string) {
  const current = getListeningEntryById(id);
  if (!current) {
    return null;
  }

  const updated: ListeningEntry = {
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
  listeningRepository.save(updated);
  return updated;
}

export function clearListeningChatHistory(id: string) {
  const current = getListeningEntryById(id);
  if (!current) {
    return null;
  }

  const updated: ListeningEntry = {
    ...current,
    updatedAt: new Date().toISOString(),
    chatHistory: [],
  };
  listeningRepository.save(updated);
  return updated;
}

export function rewardListeningFamiliarity(sentences: string[]) {
  if (sentences.length === 0) {
    return listListeningEntries();
  }

  const targetSet = new Set(sentences.map((item) => normalizeSentence(item)).filter(Boolean));
  for (const item of listeningRepository.list()) {
    if (!targetSet.has(normalizeSentence(item.sentence))) {
      continue;
    }

    const familiarity = item.familiarity + 1;
    if (familiarity > 20) {
      deleteAudioFile(item.audioFile);
      listeningRepository.remove(item.id);
      continue;
    }

    const entry = normalizeEntryGroupId(normalizeListeningEntry(item));

    listeningRepository.save({
      ...item,
      groupId: entry.groupId,
      familiarity,
      updatedAt: new Date().toISOString(),
    });
  }

  return listListeningEntries();
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
