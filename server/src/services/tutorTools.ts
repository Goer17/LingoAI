import { z } from 'zod';
import { tutorMemoryRepository } from '../db/repositories.js';
import { createSearchWordPrompt } from '../prompts/searchWordPrompt.js';
import { createId } from '../utils/id.js';
import type { AgentToolDefinition } from './openaiService.js';
import { searchWord } from './openaiService.js';
import { resolvePronunciation } from './commonPronunciationService.js';
import { enqueueAutoImageGeneration } from './autoImageService.js';
import {
  addListeningSentence,
  createListeningGroup,
  getListeningGroupById,
  listListeningEntries,
  listListeningGroups,
  pickListeningEntries,
  pickListeningEntriesByGroup,
} from './listeningService.js';
import { getSettings } from './settingsService.js';
import {
  createLearningTask,
  listLearningTasks,
  listMistakeEntries,
} from './taskService.js';
import {
  addWord,
  findWordByText,
  getWordById,
  listVocabulary,
  updateWordNote,
} from './vocabularyService.js';
import { processListeningTask, processVocabularyTask } from '../routes/vocabulary.js';
import type {
  ListeningEntry,
  ListeningGroup,
  TutorMemory,
  TutorMemoryKind,
  VocabularyEntry,
} from '../types/models.js';

export interface TutorToolContext {
  sessionId: string;
}

interface ToolOutcome {
  /** Payload the model receives as the tool result. */
  result: unknown;
  /** One-line description shown in the chat transcript and tool chip. */
  summary: string;
}

interface TutorTool {
  definition: AgentToolDefinition;
  label: string;
  execute: (args: Record<string, unknown>, context: TutorToolContext) => Promise<ToolOutcome>;
}

function parseArgs<T>(schema: z.ZodSchema<T>, args: Record<string, unknown>): T {
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success) {
    throw new Error(
      `Invalid arguments: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'arguments'}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return parsed.data;
}

function truncate(value: string, max: number) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function compactWord(entry: VocabularyEntry) {
  return {
    id: entry.id,
    text: entry.text,
    type: entry.type,
    familiarity: entry.familiarity,
    known: Boolean(entry.known),
    note: entry.note || undefined,
    meanings: entry.meanings.slice(0, 2).map((meaning) => ({
      partOfSpeech: meaning.partOfSpeech,
      englishMeaning: meaning.englishMeaning,
      chineseMeaning: meaning.chineseMeaning,
    })),
  };
}

function compactSentence(entry: ListeningEntry) {
  return {
    id: entry.id,
    sentence: entry.sentence,
    familiarity: entry.familiarity,
    known: Boolean(entry.known),
    groupId: entry.groupId,
    note: entry.note || undefined,
  };
}

function findGroupByName(name: string): ListeningGroup | null {
  const normalized = name.trim().toLowerCase();
  return listListeningGroups().find((group) => group.name.trim().toLowerCase() === normalized) ?? null;
}

function resolveGroup(args: { groupId?: string; groupName?: string }): ListeningGroup | null {
  if (args.groupId) {
    const group = getListeningGroupById(args.groupId);
    if (!group) {
      throw new Error(`Listening group ${args.groupId} was not found.`);
    }
    return group;
  }

  if (args.groupName) {
    return findGroupByName(args.groupName);
  }

  return null;
}

function clampQuestionCount(value: number | undefined, fallback: number) {
  const base = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(50, Math.max(1, Math.round(base)));
}

const listVocabularySchema = z.object({
  query: z.string().trim().max(200).optional(),
  familiarity: z.enum(['all', 'weak', 'known']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const wordLookupSchema = z
  .object({
    text: z.string().trim().min(1).max(200).optional(),
    id: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.text || value.id), {
    message: 'Provide either text or id.',
  });

const addVocabularySchema = z.object({
  text: z.string().trim().min(1).max(200),
});

const updateNoteSchema = z
  .object({
    text: z.string().trim().min(1).max(200).optional(),
    id: z.string().trim().min(1).optional(),
    note: z.string().max(4000),
  })
  .refine((value) => Boolean(value.text || value.id), {
    message: 'Provide either text or id.',
  });

const lookupWordSchema = z.object({
  text: z.string().trim().min(1).max(200),
});

const listListeningSentencesSchema = z.object({
  groupId: z.string().trim().optional(),
  groupName: z.string().trim().max(100).optional(),
  query: z.string().trim().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const addListeningSentenceSchema = z.object({
  sentence: z.string().trim().min(1).max(600),
  groupId: z.string().trim().optional(),
  groupName: z.string().trim().max(100).optional(),
});

const createListeningGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const generateQuizSchema = z.object({
  kind: z.enum(['vocabulary', 'listening']),
  groupId: z.string().trim().optional(),
  groupName: z.string().trim().max(100).optional(),
  questionCount: z.coerce.number().int().min(1).max(50).optional(),
});

const listTasksSchema = z.object({
  status: z.enum(['pending', 'ready', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const listMistakesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const rememberSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  kind: z.enum(['note', 'preference', 'goal', 'progress']).optional(),
});

const listMemoriesSchema = z.object({
  query: z.string().trim().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const forgetMemorySchema = z.object({
  id: z.string().trim().min(1),
});

const tools: Record<string, TutorTool> = {
  list_vocabulary: {
    label: 'Reading the vocabulary notebook',
    definition: {
      name: 'list_vocabulary',
      description:
        'List words and phrases in the learner\'s vocabulary notebook, optionally filtered by a text query or familiarity. Use this before giving advice about what to review.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Match against the word text, note, or meanings.' },
          familiarity: {
            type: 'string',
            enum: ['all', 'weak', 'known'],
            description: 'weak = not yet mastered, known = marked as known.',
          },
          limit: { type: 'number', description: 'Maximum items to return (default 30, max 100).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(listVocabularySchema, rawArgs);
      const query = args.query?.toLowerCase();
      const limit = args.limit ?? 30;
      const mode = args.familiarity ?? 'all';

      const entries = listVocabulary().filter((entry) => {
        if (mode === 'known' && !entry.known) {
          return false;
        }
        if (mode === 'weak' && (entry.known || entry.familiarity > 3)) {
          return false;
        }
        if (!query) {
          return true;
        }
        const haystack = [
          entry.text,
          entry.note,
          ...entry.meanings.flatMap((meaning) => [meaning.englishMeaning, meaning.chineseMeaning]),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });

      const selected = entries.slice(0, limit);
      return {
        result: {
          total: entries.length,
          returned: selected.length,
          words: selected.map(compactWord),
        },
        summary: `${selected.length} of ${entries.length} word(s)${query ? ` matching "${args.query}"` : ''}`,
      };
    },
  },

  get_vocabulary_word: {
    label: 'Opening a saved word',
    definition: {
      name: 'get_vocabulary_word',
      description:
        'Get the full notebook entry for one saved word or phrase, including meanings, derivatives, note, and recent chat history.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The word or phrase as saved in the notebook.' },
          id: { type: 'string', description: 'Notebook entry id, if known.' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(wordLookupSchema, rawArgs);
      const entry = args.id ? getWordById(args.id) : findWordByText(args.text ?? '');
      if (!entry) {
        return {
          result: { found: false, text: args.text ?? args.id ?? '' },
          summary: 'Not found in the notebook',
        };
      }

      return {
        result: {
          found: true,
          ...entry,
          chatHistory: entry.chatHistory.slice(-4),
        },
        summary: `${entry.text} — familiarity ${entry.familiarity}, ${entry.meanings.length} meaning(s)`,
      };
    },
  },

  lookup_word: {
    label: 'Looking up a word',
    definition: {
      name: 'lookup_word',
      description:
        'Look up an English word or phrase with the dictionary model to get pronunciation, meanings, examples, and derivatives. Does not save anything.',
      parameters: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', description: 'The word or phrase to look up.' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(lookupWordSchema, rawArgs);
      const result = await searchWord(createSearchWordPrompt(args.text));
      result.pronunciation = resolvePronunciation(result.text) ?? result.pronunciation;
      return {
        result,
        summary: result.found ? `${result.text} — ${result.meanings.length} meaning(s)` : `"${args.text}" was not found`,
      };
    },
  },

  add_vocabulary_word: {
    label: 'Saving a word to the notebook',
    definition: {
      name: 'add_vocabulary_word',
      description:
        'Look up a word or phrase and save it to the learner\'s vocabulary notebook. Safe to call for words that are already saved: it reports the existing entry instead of duplicating it.',
      parameters: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', description: 'The word or phrase to save.' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(addVocabularySchema, rawArgs);
      const existing = findWordByText(args.text);
      if (existing) {
        return {
          result: { created: false, alreadySaved: true, entry: compactWord(existing) },
          summary: `${existing.text} is already saved`,
        };
      }

      const result = await searchWord(createSearchWordPrompt(args.text));
      result.pronunciation = resolvePronunciation(result.text) ?? result.pronunciation;
      if (!result.found) {
        return {
          result: {
            created: false,
            found: false,
            text: args.text,
            message: result.notFoundMessage ?? `No English word or phrase named "${args.text}" was found.`,
          },
          summary: `"${args.text}" was not found`,
        };
      }

      const added = addWord(result);
      if (added.created) {
        enqueueAutoImageGeneration(added.entry);
      }

      return {
        result: {
          created: added.created,
          found: true,
          entry: compactWord(added.entry),
          meanings: added.entry.meanings,
        },
        summary: `${added.created ? 'Saved' : 'Already saved'}: ${added.entry.text}`,
      };
    },
  },

  update_vocabulary_note: {
    label: 'Updating a word note',
    definition: {
      name: 'update_vocabulary_note',
      description:
        'Replace the personal note on a saved word or phrase. Use it to store a mnemonic, a tricky collocation, or the learner\'s own example.',
      parameters: {
        type: 'object',
        required: ['note'],
        properties: {
          text: { type: 'string', description: 'The saved word or phrase.' },
          id: { type: 'string', description: 'Notebook entry id, if known.' },
          note: { type: 'string', description: 'The new note (empty string clears it).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(updateNoteSchema, rawArgs);
      const entry = args.id ? getWordById(args.id) : findWordByText(args.text ?? '');
      if (!entry) {
        throw new Error(`"${args.text ?? args.id}" is not in the notebook.`);
      }

      const updated = updateWordNote(entry.id, args.note);
      if (!updated) {
        throw new Error('The note could not be updated.');
      }

      return {
        result: { updated: true, entry: compactWord(updated) },
        summary: `Note updated for ${updated.text}`,
      };
    },
  },

  list_listening_groups: {
    label: 'Reading listening topics',
    definition: {
      name: 'list_listening_groups',
      description:
        'List the learner\'s listening topics (groups) with the number of example sentences in each one.',
      parameters: { type: 'object', properties: {} },
    },
    async execute() {
      const entries = listListeningEntries();
      const groups = listListeningGroups().map((group) => ({
        id: group.id,
        name: group.name,
        sentenceCount: entries.filter((entry) => entry.groupId === group.id).length,
      }));

      return {
        result: { groups },
        summary: `${groups.length} listening group(s)`,
      };
    },
  },

  list_listening_sentences: {
    label: 'Reading example sentences',
    definition: {
      name: 'list_listening_sentences',
      description:
        'List example sentences from the listening library, optionally limited to one group and/or filtered by a text query.',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'Listening group id.' },
          groupName: { type: 'string', description: 'Listening group name (case-insensitive).' },
          query: { type: 'string', description: 'Only return sentences containing this text.' },
          limit: { type: 'number', description: 'Maximum sentences to return (default 30, max 100).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(listListeningSentencesSchema, rawArgs);
      const group = resolveGroup(args);
      if (args.groupName && !group) {
        const groups = listListeningGroups().map((item) => item.name);
        throw new Error(`No listening group named "${args.groupName}". Existing groups: ${groups.join(', ')}.`);
      }

      const limit = args.limit ?? 30;
      const query = args.query?.toLowerCase();
      const entries = (group ? listListeningEntries(group.id) : listListeningEntries()).filter((entry) => (
        !query
        || entry.sentence.toLowerCase().includes(query)
        || entry.note.toLowerCase().includes(query)
      ));

      const selected = entries.slice(0, limit);
      return {
        result: {
          total: entries.length,
          returned: selected.length,
          group: group ? { id: group.id, name: group.name } : null,
          sentences: selected.map(compactSentence),
        },
        summary: `${selected.length} of ${entries.length} sentence(s)${group ? ` in ${group.name}` : ''}`,
      };
    },
  },

  add_listening_sentence: {
    label: 'Adding an example sentence',
    definition: {
      name: 'add_listening_sentence',
      description:
        'Add one example sentence to the listening library. Pass groupName to place it in a topic; the topic is created automatically if it does not exist yet. Sentences are deduplicated by text.',
      parameters: {
        type: 'object',
        required: ['sentence'],
        properties: {
          sentence: { type: 'string', description: 'The English sentence to save.' },
          groupId: { type: 'string', description: 'Existing listening group id.' },
          groupName: { type: 'string', description: 'Listening group name; created if missing.' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(addListeningSentenceSchema, rawArgs);
      let group = resolveGroup(args);
      if (args.groupName && !group) {
        group = createListeningGroup(args.groupName).group;
      }

      const added = addListeningSentence(args.sentence, group?.id);
      return {
        result: {
          created: added.created,
          entry: compactSentence(added.entry),
          group: group ? { id: group.id, name: group.name } : null,
        },
        summary: `${added.created ? 'Added' : 'Already saved'}: "${truncate(added.entry.sentence, 60)}"`,
      };
    },
  },

  create_listening_group: {
    label: 'Creating a listening topic',
    definition: {
      name: 'create_listening_group',
      description: 'Create a listening topic (group) for grouping example sentences. Returns the existing group when the name already exists.',
      parameters: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', description: 'Topic name, for example "Job interviews".' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(createListeningGroupSchema, rawArgs);
      const created = createListeningGroup(args.name);
      return {
        result: { created: created.created, group: created.group },
        summary: `${created.created ? 'Created' : 'Already exists'}: ${created.group.name}`,
      };
    },
  },

  generate_quiz: {
    label: 'Generating a quiz',
    definition: {
      name: 'generate_quiz',
      description:
        'Start generating a quiz in the background. Vocabulary quizzes use the notebook; listening quizzes use example sentences (all groups, or one group). The learner opens Tasks to take it once it is ready.',
      parameters: {
        type: 'object',
        required: ['kind'],
        properties: {
          kind: { type: 'string', enum: ['vocabulary', 'listening'], description: 'Quiz category.' },
          groupId: { type: 'string', description: 'Listening group id (listening only).' },
          groupName: { type: 'string', description: 'Listening group name (listening only).' },
          questionCount: { type: 'number', description: 'Number of questions (1-50, default from settings).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(generateQuizSchema, rawArgs);
      const settings = getSettings();

      if (args.kind === 'vocabulary') {
        const available = listVocabulary().filter((entry) => !entry.known);
        if (available.length === 0) {
          throw new Error('No vocabulary available for a quiz. Add some words first.');
        }

        const count = clampQuestionCount(args.questionCount, settings.quizMaxQuestions?.vocabulary ?? 10);
        const task = createLearningTask('vocabulary');
        void processVocabularyTask(task.id, count);
        return {
          result: {
            taskId: task.id,
            kind: 'vocabulary',
            status: task.status,
            questionCount: Math.min(count, available.length),
          },
          summary: `Started a ${Math.min(count, available.length)}-question vocabulary quiz`,
        };
      }

      const group = resolveGroup(args);
      if (args.groupName && !group) {
        throw new Error(`No listening group named "${args.groupName}".`);
      }

      const available = group
        ? pickListeningEntriesByGroup(group.id)
        : pickListeningEntries(listListeningEntries());
      if (available.length === 0) {
        throw new Error('No listening sentences available for a quiz in that scope.');
      }

      const count = clampQuestionCount(args.questionCount, settings.quizMaxQuestions?.listening ?? 10);
      const task = createLearningTask(
        'listening',
        group ? { groupId: group.id, groupName: group.name } : undefined,
      );
      void processListeningTask(task.id, group?.id, count);

      return {
        result: {
          taskId: task.id,
          kind: 'listening',
          status: task.status,
          questionCount: Math.min(count, available.length),
          group: group ? { id: group.id, name: group.name } : null,
        },
        summary: `Started a ${Math.min(count, available.length)}-question listening quiz${group ? ` on ${group.name}` : ''}`,
      };
    },
  },

  list_learning_tasks: {
    label: 'Checking learning tasks',
    definition: {
      name: 'list_learning_tasks',
      description: 'List recent learning tasks (quizzes in progress, ready to start, or failed), newest first.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'ready', 'failed'] },
          limit: { type: 'number', description: 'Maximum tasks to return (default 10, max 100).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(listTasksSchema, rawArgs);
      const limit = args.limit ?? 10;
      const tasks = listLearningTasks()
        .filter((task) => !args.status || task.status === args.status)
        .slice(0, limit)
        .map((task) => ({
          id: task.id,
          type: task.type,
          status: task.status,
          questionCount: task.questionCount,
          createdAt: task.createdAt,
          groupName: task.groupName ?? undefined,
          error: task.error ?? undefined,
        }));

      return {
        result: { tasks },
        summary: `${tasks.length} task(s)`,
      };
    },
  },

  list_mistakes: {
    label: 'Checking the mistake notebook',
    definition: {
      name: 'list_mistakes',
      description: 'List items in the learner\'s mistake notebook, most recently updated first.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum entries to return (default 20, max 100).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(listMistakesSchema, rawArgs);
      const limit = args.limit ?? 20;
      const all = listMistakeEntries();
      const mistakes = all.slice(0, limit).map((entry) => ({
        id: entry.id,
        type: entry.type,
        word: entry.word,
        sentence: entry.sentence,
        answer: entry.answer,
        updatedAt: entry.updatedAt,
      }));

      return {
        result: { total: all.length, mistakes },
        summary: `${mistakes.length} mistake(s)`,
      };
    },
  },

  remember: {
    label: 'Saving a memory',
    definition: {
      name: 'remember',
      description:
        'Save one durable fact about the learner to long-term memory: a goal, preference, recurring mistake, or progress insight. Write it as a short standalone sentence. Never store secrets or passwords.',
      parameters: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', description: 'The memory, written as a standalone sentence.' },
          kind: {
            type: 'string',
            enum: ['note', 'preference', 'goal', 'progress'],
            description: 'Memory category. Defaults to note.',
          },
        },
      },
    },
    async execute(rawArgs, context) {
      const args = parseArgs(rememberSchema, rawArgs);
      const now = new Date().toISOString();
      const memory: TutorMemory = {
        id: createId('memory'),
        kind: (args.kind ?? 'note') as TutorMemoryKind,
        content: args.content,
        createdAt: now,
        updatedAt: now,
        sessionId: context.sessionId,
      };
      tutorMemoryRepository.save(memory);
      return {
        result: memory,
        summary: `Remembered: ${truncate(memory.content, 80)}`,
      };
    },
  },

  list_memories: {
    label: 'Recalling memories',
    definition: {
      name: 'list_memories',
      description: 'Search the chronological long-term memory log when you need older context that is not in the system prompt.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Only return memories containing this text.' },
          limit: { type: 'number', description: 'Maximum memories to return (default 50, max 200).' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(listMemoriesSchema, rawArgs);
      const query = args.query?.toLowerCase();
      const memories = tutorMemoryRepository
        .list()
        .filter((memory) => !query || memory.content.toLowerCase().includes(query));
      const selected = memories.slice(-(args.limit ?? 50));

      return {
        result: {
          total: memories.length,
          returned: selected.length,
          // Chronological order, oldest first.
          memories: selected,
        },
        summary: `${selected.length} of ${memories.length} memory item(s)`,
      };
    },
  },

  forget_memory: {
    label: 'Deleting a memory',
    definition: {
      name: 'forget_memory',
      description: 'Delete one memory by id when it is outdated or the learner asks you to forget it.',
      parameters: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Memory id from the memory log.' },
        },
      },
    },
    async execute(rawArgs) {
      const args = parseArgs(forgetMemorySchema, rawArgs);
      const memory = tutorMemoryRepository.getById(args.id);
      if (!memory) {
        return {
          result: { removed: false, id: args.id },
          summary: 'Memory not found',
        };
      }

      tutorMemoryRepository.remove(memory.id);
      return {
        result: { removed: true, id: memory.id },
        summary: `Deleted memory: ${truncate(memory.content, 60)}`,
      };
    },
  },
};

export const tutorToolDefinitions: AgentToolDefinition[] = Object.values(tools).map((tool) => tool.definition);

export function getTutorTool(name: string): TutorTool | null {
  return tools[name] ?? null;
}
