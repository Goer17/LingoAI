import { tutorMemoryRepository, tutorMessageRepository, tutorSessionRepository } from '../db/repositories.js';
import { createTutorPrompt } from '../prompts/tutorPrompt.js';
import type { AgentMessage, AgentToolCall } from './openaiService.js';
import { streamAgentCompletion } from './openaiService.js';
import type { TutorToolContext } from './tutorTools.js';
import { getTutorTool, tutorToolDefinitions } from './tutorTools.js';
import { listListeningEntries, listListeningGroups } from './listeningService.js';
import { listVocabulary } from './vocabularyService.js';
import { createId } from '../utils/id.js';
import type {
  TutorMemory,
  TutorMemoryKind,
  TutorMessage,
  TutorSession,
  TutorToolTrace,
} from '../types/models.js';

export const DEFAULT_TUTOR_TITLE = 'New chat';

/** How many past messages are replayed to the model. Older turns stay in the
 *  database and remain visible in the transcript. */
const HISTORY_LIMIT = 40;
/** Safety valve so a tool-happy model cannot loop forever. The final round
 *  runs without tools to force a written answer. */
const MAX_TOOL_ROUNDS = 6;
const MAX_TOOL_RESULT_CHARS = 8000;
const MAX_MEMORY_CHARS = 1000;

export type TutorStreamEvent =
  | { type: 'delta'; content: string }
  | {
      type: 'tool';
      status: 'start' | 'done';
      name: string;
      label: string;
      ok?: boolean;
      summary?: string;
    };

type TutorEmitter = (event: TutorStreamEvent) => void;

function deriveTitle(message: string) {
  const compact = message.trim().replace(/\s+/g, ' ');
  if (compact.length <= 60) {
    return compact;
  }
  return `${compact.slice(0, 59)}…`;
}

function touchSession(session: TutorSession, patch: Partial<Pick<TutorSession, 'title' | 'updatedAt'>> = {}) {
  const updated: TutorSession = {
    ...session,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
  tutorSessionRepository.save(updated);
  return updated;
}

export function listTutorSessions() {
  return tutorSessionRepository.list();
}

export function getTutorSessionDetail(id: string) {
  const session = tutorSessionRepository.getById(id);
  if (!session) {
    return null;
  }

  return {
    session,
    messages: tutorMessageRepository.listBySession(id),
  };
}

export function createTutorSession(title?: string) {
  const now = new Date().toISOString();
  const session: TutorSession = {
    id: createId('tutor'),
    title: title?.trim() || DEFAULT_TUTOR_TITLE,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    preview: '',
  };
  tutorSessionRepository.save(session);
  return session;
}

export function renameTutorSession(id: string, title: string) {
  const session = tutorSessionRepository.getById(id);
  if (!session) {
    return null;
  }

  touchSession(session, { title: title.trim() || DEFAULT_TUTOR_TITLE });
  return tutorSessionRepository.getById(id);
}

export function deleteTutorSession(id: string) {
  const session = tutorSessionRepository.getById(id);
  if (!session) {
    return false;
  }

  tutorSessionRepository.remove(id);
  return true;
}

export function listTutorMemories() {
  return tutorMemoryRepository.list();
}

export function addTutorMemory(content: string, kind: TutorMemoryKind = 'note', sessionId?: string) {
  const trimmed = content.trim().slice(0, MAX_MEMORY_CHARS);
  if (!trimmed) {
    throw new Error('Memory content is required.');
  }

  const now = new Date().toISOString();
  const memory: TutorMemory = {
    id: createId('memory'),
    kind,
    content: trimmed,
    createdAt: now,
    updatedAt: now,
    ...(sessionId ? { sessionId } : {}),
  };
  tutorMemoryRepository.save(memory);
  return memory;
}

export function removeTutorMemory(id: string) {
  if (!tutorMemoryRepository.getById(id)) {
    return false;
  }

  tutorMemoryRepository.remove(id);
  return true;
}

function buildAgentMessages(sessionId: string, userMessage: string): AgentMessage[] {
  const memories = tutorMemoryRepository.list();
  const vocabulary = listVocabulary();
  const listeningEntries = listListeningEntries();
  const listeningGroups = listListeningGroups();

  const systemPrompt = createTutorPrompt({ memories, vocabulary, listeningEntries, listeningGroups });
  const history = tutorMessageRepository.listRecent(sessionId, HISTORY_LIMIT);

  const messages: AgentMessage[] = [{ role: 'system', content: systemPrompt }];
  for (const message of history) {
    messages.push({ role: message.role, content: message.content });
  }

  // Always end on the new user message (it was persisted just before this).
  const last = history[history.length - 1];
  if (!last || last.role !== 'user' || last.content !== userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  return messages;
}

function toolResultText(outcome: unknown) {
  let text: string;
  try {
    text = JSON.stringify(outcome);
  } catch {
    text = String(outcome);
  }

  if (text.length <= MAX_TOOL_RESULT_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_TOOL_RESULT_CHARS)}… (truncated)`;
}

async function runTool(
  call: AgentToolCall,
  context: TutorToolContext,
  emit: TutorEmitter,
  traces: TutorToolTrace[],
) {
  const tool = getTutorTool(call.name);
  const label = tool?.label ?? `Calling ${call.name}`;

  if (!tool) {
    emit({ type: 'tool', status: 'start', name: call.name, label });
    const trace: TutorToolTrace = { name: call.name, label, ok: false, summary: 'Unknown tool' };
    traces.push(trace);
    emit({ type: 'tool', status: 'done', name: call.name, label, ok: false, summary: trace.summary });
    return { content: toolResultText({ error: `Unknown tool: ${call.name}` }), trace };
  }

  emit({ type: 'tool', status: 'start', name: call.name, label });

  let args: Record<string, unknown>;
  try {
    const parsed = JSON.parse(call.arguments || '{}') as unknown;
    args = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    args = {};
  }

  try {
    const outcome = await tool.execute(args, context);
    const trace: TutorToolTrace = { name: call.name, label, ok: true, summary: outcome.summary };
    traces.push(trace);
    emit({ type: 'tool', status: 'done', name: call.name, label, ok: true, summary: outcome.summary });
    return { content: toolResultText(outcome.result), trace };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool call failed.';
    const trace: TutorToolTrace = { name: call.name, label, ok: false, summary: message };
    traces.push(trace);
    emit({ type: 'tool', status: 'done', name: call.name, label, ok: false, summary: message });
    return { content: toolResultText({ error: message }), trace };
  }
}

/**
 * Run one tutor turn: persist the user message, stream the agent loop
 * (model → tools → model → …), then persist and return the assistant reply.
 * `emit` receives text deltas and tool lifecycle events; the caller is
 * responsible for persisting nothing and for the final `done` SSE frame.
 */
export async function streamTutorReply(
  sessionId: string,
  userMessage: string,
  emit: TutorEmitter,
): Promise<{ message: TutorMessage; session: TutorSession }> {
  let session = tutorSessionRepository.getById(sessionId);
  if (!session) {
    throw new Error('Tutor session not found.');
  }

  const message = userMessage.trim();
  if (!message) {
    throw new Error('Message is required.');
  }

  const now = new Date().toISOString();
  const userRecord: TutorMessage = {
    id: createId('tutor-msg'),
    role: 'user',
    content: message,
    createdAt: now,
  };
  tutorMessageRepository.save(sessionId, userRecord);

  session = touchSession(session, {
    updatedAt: now,
    ...(session.title === DEFAULT_TUTOR_TITLE ? { title: deriveTitle(message) } : {}),
  });

  const working = buildAgentMessages(sessionId, message);
  const traces: TutorToolTrace[] = [];
  const context: TutorToolContext = { sessionId };
  let fullContent = '';

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const tools = round < MAX_TOOL_ROUNDS ? tutorToolDefinitions : [];
    const result = await streamAgentCompletion(working, tools, (chunk) => {
      emit({ type: 'delta', content: chunk });
    });

    if (result.content) {
      fullContent = fullContent ? `${fullContent}\n\n${result.content}` : result.content;
    }

    if (result.toolCalls.length === 0 || tools.length === 0) {
      break;
    }

    working.push({
      role: 'assistant',
      content: result.content || null,
      tool_calls: result.toolCalls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.arguments || '{}' },
      })),
    });

    for (const call of result.toolCalls) {
      const { content } = await runTool(call, context, emit, traces);
      working.push({
        role: 'tool',
        tool_call_id: call.id,
        content,
      });
    }
  }

  const assistantRecord: TutorMessage = {
    id: createId('tutor-msg'),
    role: 'assistant',
    content: fullContent.trim() || 'I ran the actions above but did not produce a reply. Ask me to continue.',
    createdAt: new Date().toISOString(),
    ...(traces.length > 0 ? { toolCalls: traces } : {}),
  };
  tutorMessageRepository.save(sessionId, assistantRecord);

  touchSession(session);
  // Re-read so the returned session carries the fresh message count/preview
  // that the client puts straight into its session list.
  const refreshedSession = tutorSessionRepository.getById(sessionId) ?? session;
  return { message: assistantRecord, session: refreshedSession };
}
