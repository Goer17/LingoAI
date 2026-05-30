<template>
  <section class="writing-page">
    <div class="card writing-topic-card">
      <div class="section-heading">
        <p class="eyebrow">Expression</p>
        <h2>Topic Workspace</h2>
        <p class="subtle-copy">Create topic-specific knowledge points and practise through scenario conversations.</p>
      </div>
      <form class="writing-topic-form" @submit.prevent="handleAddTopic">
        <input
          v-model="topicInput"
          type="text"
          placeholder="Create a new topic (e.g., Environmental Protection)"
          :disabled="creatingTopic"
        />
        <button class="button button-primary" type="submit" :disabled="creatingTopic || !topicInput.trim()">
          {{ creatingTopic ? 'Adding...' : 'Add Topic' }}
        </button>
      </form>
    </div>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <section class="card writing-workspace-card">
      <div class="workspace-grid writing-grid">
        <div class="card list-card">
          <div class="inline-heading">
            <h3>Topics</h3>
            <span class="muted-text">{{ store.writingTopics.length }} topics</span>
          </div>
          <p v-if="store.writingTopics.length === 0" class="empty-copy">No topics yet.</p>
          <div v-else class="list-scroller">
            <button
              v-for="topic in store.writingTopics"
              :key="topic.id"
              class="word-row writing-topic-row"
              :class="{ active: store.selectedWritingTopicId === topic.id }"
              type="button"
              @click="store.selectWritingTopic(topic.id)"
            >
              <div class="task-main">
                <p class="writing-topic-title">{{ topic.title }}</p>
                <p class="muted-text">Points: {{ topic.knowledgePoints.length }}</p>
              </div>
            </button>
          </div>
        </div>

        <section class="card detail-card">
          <div v-if="selectedTopic" class="detail-content writing-detail-shell">
            <div class="detail-head">
              <div>
                <p class="eyebrow">Topic</p>
                <h2>{{ selectedTopic.title }}</h2>
                <p class="subtle-copy">Build your idea bank, then generate a writing practice in one click.</p>
              </div>
              <div class="result-actions">
                <button
                  v-if="isRenamingTopic"
                  class="button button-secondary"
                  type="button"
                  @click="handleCancelTopicRename"
                >
                  Cancel
                </button>
                <button
                  v-else
                  class="button button-secondary"
                  type="button"
                  @click="handleStartTopicRename"
                >
                  Rename
                </button>
                <button class="button button-secondary" type="button" :disabled="startingTask" @click="handleDeleteTopic">
                  Delete Topic
                </button>
              </div>
            </div>

            <form v-if="isRenamingTopic" class="writing-topic-form" @submit.prevent="handleRenameTopic">
              <input
                v-model="topicRenameInput"
                type="text"
                placeholder="Rename current topic"
                :disabled="updatingTopicTitle"
              />
              <button
                class="button button-primary"
                type="submit"
                :disabled="updatingTopicTitle || !topicRenameInput.trim() || topicRenameInput.trim() === selectedTopic.title"
              >
                {{ updatingTopicTitle ? 'Saving...' : 'Save' }}
              </button>
            </form>

            <div class="writing-points-layout">
              <section class="card writing-points-card">
                <div class="inline-heading">
                  <h3>Knowledge Points</h3>
                  <div class="result-actions">
                    <span class="muted-text">{{ selectedTopic.knowledgePoints.length }} items</span>
                    <button
                      v-if="isAddingPoint"
                      class="button button-secondary"
                      type="button"
                      @click="handleCancelAddPoint"
                    >
                      Cancel
                    </button>
                    <button
                      v-else
                      class="button button-secondary"
                      type="button"
                      @click="handleStartAddPoint"
                    >
                      Add Point
                    </button>
                  </div>
                </div>
                <form v-if="isAddingPoint" class="chat-form" @submit.prevent="handleAddPoint">
                  <input
                    v-model="newPointTitle"
                    type="text"
                    placeholder="Point title (e.g., cause-effect paragraph pattern)"
                    :disabled="creatingPoint"
                  />
                  <textarea
                    v-model="newPointContent"
                    rows="4"
                    placeholder="Point content in Markdown..."
                    :disabled="creatingPoint"
                  />
                  <button
                    class="button button-primary"
                    type="submit"
                    :disabled="creatingPoint || !newPointTitle.trim()"
                  >
                    {{ creatingPoint ? 'Adding...' : 'Add Point' }}
                  </button>
                </form>

                <p v-if="selectedTopic.knowledgePoints.length === 0" class="empty-copy">No knowledge points yet.</p>
                <div v-else class="list-scroller">
                  <button
                    v-for="point in selectedTopic.knowledgePoints"
                    :key="point.id"
                    class="word-row writing-point-row"
                    :class="{ active: store.selectedWritingPointId === point.id }"
                    type="button"
                    @click="store.selectWritingPoint(point.id)"
                  >
                    <div class="task-main">
                      <p class="writing-point-title">{{ point.title }}</p>
                      <p class="muted-text writing-point-preview">{{ point.content || 'No content yet.' }}</p>
                    </div>
                  </button>
                </div>
              </section>

              <section class="card writing-point-detail-card">
                <div v-if="selectedPoint" class="detail-content">
                  <div class="inline-heading">
                    <div>
                      <p class="eyebrow">Knowledge Point</p>
                      <h3>{{ isEditingPoint ? 'Edit Point' : selectedPoint.title }}</h3>
                    </div>
                    <div class="result-actions">
                      <button
                        v-if="isEditingPoint"
                        class="button button-secondary"
                        type="button"
                        @click="handleCancelPointEdit"
                      >
                        Cancel
                      </button>
                      <button
                        v-if="isEditingPoint"
                        class="button button-primary"
                        type="button"
                        :disabled="savingPoint || !pointEditTitle.trim()"
                        @click="handleSavePoint"
                      >
                        {{ savingPoint ? 'Saving...' : 'Save' }}
                      </button>
                      <button
                        v-else
                        class="button button-secondary"
                        type="button"
                        @click="handleStartPointEdit"
                      >
                        Edit
                      </button>
                      <button class="button button-secondary" type="button" @click="handleDeletePoint">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div v-if="isEditingPoint" class="chat-form">
                    <input v-model="pointEditTitle" type="text" placeholder="Point title" />
                    <textarea
                      v-model="pointEditContent"
                      rows="8"
                      placeholder="Write Markdown content here..."
                    />
                  </div>

                  <div v-else class="writing-markdown-preview">
                    <p class="eyebrow">Content</p>
                    <div
                      v-if="selectedPoint.content.trim()"
                      class="chat-content markdown-content"
                      v-html="renderMarkdown(selectedPoint.content)"
                    />
                    <p v-else class="empty-copy">No content yet.</p>
                  </div>

                  <div class="chat-shell">
                    <div class="section-heading inline-heading">
                      <div>
                        <p class="eyebrow">Tutor Chat</p>
                        <h3>Ask About This Point</h3>
                      </div>
                      <button
                        class="button button-secondary"
                        type="button"
                        :disabled="chatLoading || selectedPoint.chatHistory.length === 0"
                        @click="handleClearChat"
                      >
                        Clear
                      </button>
                    </div>
                    <div ref="chatHistoryRef" class="chat-history">
                      <div
                        v-for="chat in selectedPoint.chatHistory"
                        :key="chat.id"
                        class="chat-bubble"
                        :class="chat.role"
                      >
                        <span class="chat-role">{{ chat.role }}</span>
                        <div class="chat-content markdown-content" v-html="renderMarkdown(chat.content)" />
                      </div>
                      <p v-if="selectedPoint.chatHistory.length === 0" class="empty-copy">No discussion yet.</p>
                    </div>
                    <form class="chat-form" @submit.prevent="handleSendChat">
                      <textarea
                        v-model="chatDraft"
                        rows="3"
                        placeholder="Ask about grammar, topic ideas, organization, or better expressions..."
                      />
                      <button
                        class="button button-primary"
                        type="submit"
                        :disabled="chatLoading || !chatDraft.trim()"
                      >
                        {{ chatLoading ? 'Sending...' : 'Send' }}
                      </button>
                    </form>
                  </div>
                </div>

                <div v-else class="placeholder-panel">
                  <p class="eyebrow">Knowledge Point</p>
                  <h2>Select one point</h2>
                  <p class="subtle-copy">You can edit content, preview Markdown, and ask the tutor here.</p>
                </div>
              </section>
            </div>

            <div class="learning-bar">
              <div>
                <p class="eyebrow">Practice</p>
                <h2>Scenario Conversation</h2>
                <p class="subtle-copy">Start a role-play conversation based on this topic and your knowledge points.</p>
              </div>
              <button
                class="button button-primary"
                type="button"
                :disabled="startingTask || selectedTopic.knowledgePoints.length === 0"
                @click="startLearning"
              >
                {{ startingTask ? 'Preparing...' : 'Learning' }}
              </button>
            </div>
          </div>

          <div v-else class="placeholder-panel">
            <p class="eyebrow">Topic</p>
            <h2>Create your first topic</h2>
            <p class="subtle-copy">Once a topic exists, you can build knowledge points and start writing practice.</p>
          </div>
        </section>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useVocabularyStore } from '@/stores/vocabulary';

const store = useVocabularyStore();
const router = useRouter();
const error = ref('');
const message = ref('');
const topicInput = ref('');
const topicRenameInput = ref('');
const creatingTopic = ref(false);
const updatingTopicTitle = ref(false);
const creatingPoint = ref(false);
const savingPoint = ref(false);
const startingTask = ref(false);
const chatLoading = ref(false);
const isRenamingTopic = ref(false);
const isAddingPoint = ref(false);
const isEditingPoint = ref(false);
const newPointTitle = ref('');
const newPointContent = ref('');
const pointEditTitle = ref('');
const pointEditContent = ref('');
const chatDraft = ref('');
const chatHistoryRef = ref<HTMLElement | null>(null);

const selectedTopic = computed(() => store.selectedWritingTopic);
const selectedPoint = computed(() => store.selectedWritingPoint);

onMounted(async () => {
  try {
    await store.fetchWritingTopics();
    syncTopicEditState();
    syncPointEditState();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load writing topics.';
  }
});

watch(
  () => selectedTopic.value?.id,
  () => {
    syncTopicEditState();
    syncPointEditState();
  },
);

watch(
  () => selectedPoint.value?.id,
  () => {
    syncPointEditState();
  },
);

watch(
  () => {
    const history = selectedPoint.value?.chatHistory ?? [];
    const last = history[history.length - 1];
    return `${history.length}:${last?.id ?? ''}:${last?.content.length ?? 0}`;
  },
  async () => {
    await nextTick();
    if (!chatHistoryRef.value) {
      return;
    }

    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
  },
);

function syncTopicEditState() {
  topicRenameInput.value = selectedTopic.value?.title ?? '';
  isRenamingTopic.value = false;
  isAddingPoint.value = false;
  newPointTitle.value = '';
  newPointContent.value = '';
}

function syncPointEditState() {
  pointEditTitle.value = selectedPoint.value?.title ?? '';
  pointEditContent.value = selectedPoint.value?.content ?? '';
  isEditingPoint.value = false;
}

function handleStartTopicRename() {
  if (!selectedTopic.value) {
    return;
  }

  topicRenameInput.value = selectedTopic.value.title;
  isRenamingTopic.value = true;
}

function handleCancelTopicRename() {
  topicRenameInput.value = selectedTopic.value?.title ?? '';
  isRenamingTopic.value = false;
}

function handleStartAddPoint() {
  if (!selectedTopic.value) {
    return;
  }

  newPointTitle.value = '';
  newPointContent.value = '';
  isAddingPoint.value = true;
}

function handleCancelAddPoint() {
  newPointTitle.value = '';
  newPointContent.value = '';
  isAddingPoint.value = false;
}

function handleStartPointEdit() {
  if (!selectedPoint.value) {
    return;
  }

  syncPointEditState();
  isEditingPoint.value = true;
}

function handleCancelPointEdit() {
  syncPointEditState();
}

async function handleAddTopic() {
  const title = topicInput.value.trim();
  if (!title) {
    return;
  }

  error.value = '';
  message.value = '';
  creatingTopic.value = true;
  try {
    const result = await store.addWritingTopic(title);
    message.value = result.created ? 'Topic added.' : 'Topic already exists.';
    topicInput.value = '';
    syncTopicEditState();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add topic.';
  } finally {
    creatingTopic.value = false;
  }
}

async function handleRenameTopic() {
  const topic = selectedTopic.value;
  if (!topic) {
    return;
  }

  error.value = '';
  message.value = '';
  updatingTopicTitle.value = true;
  try {
    await store.updateWritingTopicTitle(topic.id, topicRenameInput.value.trim());
    message.value = 'Topic updated.';
    isRenamingTopic.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update topic.';
  } finally {
    updatingTopicTitle.value = false;
  }
}

async function handleDeleteTopic() {
  const topic = selectedTopic.value;
  if (!topic) {
    return;
  }

  error.value = '';
  message.value = '';
  try {
    await store.deleteWritingTopic(topic.id);
    message.value = 'Topic deleted.';
    syncTopicEditState();
    syncPointEditState();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete topic.';
  }
}

async function handleAddPoint() {
  const topic = selectedTopic.value;
  if (!topic) {
    return;
  }

  error.value = '';
  message.value = '';
  creatingPoint.value = true;
  try {
    await store.addWritingKnowledgePoint(topic.id, {
      title: newPointTitle.value.trim(),
      content: newPointContent.value,
    });
    message.value = 'Knowledge point added.';
    newPointTitle.value = '';
    newPointContent.value = '';
    isAddingPoint.value = false;
    syncPointEditState();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add knowledge point.';
  } finally {
    creatingPoint.value = false;
  }
}

async function handleSavePoint() {
  const topic = selectedTopic.value;
  const point = selectedPoint.value;
  if (!topic || !point) {
    return;
  }

  error.value = '';
  message.value = '';
  savingPoint.value = true;
  try {
    await store.updateWritingKnowledgePoint(topic.id, point.id, {
      title: pointEditTitle.value.trim(),
      content: pointEditContent.value,
    });
    message.value = 'Knowledge point saved.';
    syncPointEditState();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save knowledge point.';
  } finally {
    savingPoint.value = false;
  }
}

async function handleDeletePoint() {
  const topic = selectedTopic.value;
  const point = selectedPoint.value;
  if (!topic || !point) {
    return;
  }

  error.value = '';
  message.value = '';
  try {
    await store.deleteWritingKnowledgePoint(topic.id, point.id);
    message.value = 'Knowledge point deleted.';
    syncPointEditState();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete knowledge point.';
  }
}

async function handleSendChat() {
  const topic = selectedTopic.value;
  const point = selectedPoint.value;
  const draft = chatDraft.value.trim();
  if (!topic || !point || !draft) {
    return;
  }

  error.value = '';
  chatLoading.value = true;
  try {
    await store.sendWritingKnowledgePointChatMessage(topic.id, point.id, draft);
    chatDraft.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chat failed.';
  } finally {
    chatLoading.value = false;
  }
}

async function handleClearChat() {
  const topic = selectedTopic.value;
  const point = selectedPoint.value;
  if (!topic || !point) {
    return;
  }

  error.value = '';
  try {
    await store.clearWritingKnowledgePointChat(topic.id, point.id);
    message.value = 'Tutor chat cleared.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to clear chat.';
  }
}

async function startLearning() {
  const topic = selectedTopic.value;
  if (!topic) {
    return;
  }

  error.value = '';
  startingTask.value = true;
  try {
    await store.createExpressionTask(topic.id);
    await router.push('/tasks');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create expression task.';
  } finally {
    startingTask.value = false;
  }
}

function renderMarkdown(content: string) {
  const normalized = escapeHtml(content).replace(/\r\n/g, '\n');
  const codeBlocks: string[] = [];
  const withCodeTokens = normalized.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_match, lang, block) => {
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
    const langAttr = lang ? ` data-lang="${lang}"` : '';
    codeBlocks.push(`<pre class="md-pre"${langAttr}><code>${block}</code></pre>`);
    return token;
  });

  const lines = withCodeTokens.split('\n');
  const parts: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  function closeListIfNeeded() {
    if (!listType) {
      return;
    }

    parts.push(`</${listType}>`);
    listType = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeListIfNeeded();
      continue;
    }

    if (/^@@CODEBLOCK_\d+@@$/.test(trimmed)) {
      closeListIfNeeded();
      parts.push(trimmed);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeListIfNeeded();
      const level = heading[1].length;
      parts.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      if (listType !== 'ul') {
        closeListIfNeeded();
        listType = 'ul';
        parts.push('<ul>');
      }
      parts.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeListIfNeeded();
        listType = 'ol';
        parts.push('<ol>');
      }
      parts.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      closeListIfNeeded();
      parts.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    closeListIfNeeded();
    parts.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  closeListIfNeeded();
  return parts.join('').replace(/@@CODEBLOCK_(\d+)@@/g, (_match, index) => codeBlocks[Number(index)] ?? '');
}

function renderInlineMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}
</script>
