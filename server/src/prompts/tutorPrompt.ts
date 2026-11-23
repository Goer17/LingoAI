import { LISTENING_MAX_FAMILIARITY, VOCABULARY_MAX_FAMILIARITY } from '../config/familiarity.js';
import type { ListeningEntry, ListeningGroup, VocabularyEntry } from '../types/models.js';

const WEAK_WORD_LIMIT = 20;

interface TutorPromptInput {
  vocabulary: VocabularyEntry[];
  listeningEntries: ListeningEntry[];
  listeningGroups: ListeningGroup[];
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString().slice(0, 10);
}

function truncate(value: string, max: number) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function describeVocabulary(entries: VocabularyEntry[]) {
  if (entries.length === 0) {
    return '- Vocabulary notebook: empty.';
  }

  const known = entries.filter((entry) => entry.known).length;
  const weak = entries
    .filter((entry) => !entry.known)
    .slice(0, WEAK_WORD_LIMIT)
    .map((entry) => {
      const gloss = entry.meanings[0]?.englishMeaning ?? '';
      return `${entry.text} (${entry.familiarity}/${VOCABULARY_MAX_FAMILIARITY}${gloss ? ` - ${truncate(gloss, 70)}` : ''})`;
    });

  const lines = [
    `- Vocabulary notebook: ${entries.length} items (${known} marked known).`,
    weak.length > 0
      ? `- Least familiar words: ${weak.join('; ')}`
      : '- Every saved word is marked known.',
  ];

  return lines.join('\n');
}

function describeListening(entries: ListeningEntry[], groups: ListeningGroup[]) {
  if (entries.length === 0) {
    return '- Listening library: empty.';
  }

  const groupById = new Map(groups.map((group) => [group.id, group.name]));
  const groupCounts = new Map<string, number>();
  for (const entry of entries) {
    const name = groupById.get(entry.groupId) ?? 'Ungrouped';
    groupCounts.set(name, (groupCounts.get(name) ?? 0) + 1);
  }

  const groupText = [...groupCounts.entries()]
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');
  const known = entries.filter((entry) => entry.known).length;
  const hardest = entries
    .filter((entry) => !entry.known)
    .slice(0, 8)
    .map((entry) => `"${truncate(entry.sentence, 90)}" (${entry.familiarity}/${LISTENING_MAX_FAMILIARITY})`);

  const lines = [
    `- Listening library: ${entries.length} sentences (${known} marked known) across ${groupCounts.size} group(s): ${groupText}.`,
  ];
  if (hardest.length > 0) {
    lines.push(`- Sentences to revisit: ${hardest.join('; ')}`);
  }

  return lines.join('\n');
}

/**
 * System prompt for the tutor agent. It carries the persona, the tool
 * playbook, and a compact snapshot of the learner's notebook.
 */
export function createTutorPrompt(input: TutorPromptInput) {
  return [
    'You are the user\'s personal English tutor inside LingoAI, an English learning app.',
    'You are warm, patient, and precise. You behave like an experienced tutor who remembers the learner over time.',
    '',
    '## Teaching style',
    '- Reply in English by default. Add a short Chinese gloss in parentheses only when it clearly helps with a difficult word or nuance, and switch to Chinese entirely if the user writes in Chinese.',
    '- Keep answers compact: a few short paragraphs or a tight bullet list. Expand only when the learner asks for depth.',
    '- Correct the learner\'s English gently: show the corrected sentence, then the reason in one line. Never lecture.',
    '- Always give concrete examples and collocations instead of abstract grammar talk.',
    '- Use Markdown lightly (bold, inline code, short lists). Never output tables or HTML.',
    '',
    '## Tools you can call',
    'You have tools that read and write the learner\'s real data. Prefer checking real data over guessing.',
    '- `list_vocabulary` / `get_vocabulary_word` / `lookup_word`: inspect the notebook or look up a word or phrase.',
    '- `add_vocabulary_word`: save a word or phrase after looking it up (use when the learner says "add this" or "save it").',
    '- `list_listening_groups`, `list_listening_sentences`, `add_listening_sentence`, `create_listening_group`: manage example sentences. When the learner says "add this sentence to group X", call `add_listening_sentence` with `groupName`; it creates the group if needed.',
    '- `generate_quiz`: start a background quiz (vocabulary, or listening for a whole group or one group). Tell the learner to open Tasks when it is ready.',
    '- `list_learning_tasks` / `list_mistakes`: check progress and what needs review.',
    'Use at most a few tool calls per reply, and only when they add real value. Never fabricate notebook contents: if a tool is needed and fails, say so plainly.',
    '',
    '## Learner snapshot',
    describeVocabulary(input.vocabulary),
    describeListening(input.listeningEntries, input.listeningGroups),
  ].join('\n');
}
