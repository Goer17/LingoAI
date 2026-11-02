<template>
  <section class="reading-page">
    <div class="reading-grid">
      <!-- 1. Library: categories + article titles -->
      <aside class="card reading-library">
        <div class="reading-pane-head">
          <div>
            <p class="eyebrow">Reading</p>
            <h2>Library</h2>
          </div>
          <button
            v-if="!categoryFormOpen"
            class="button button-secondary reading-mini"
            type="button"
            @click="categoryFormOpen = true"
          >
            + Category
          </button>
        </div>

        <form v-if="categoryFormOpen" class="reading-inline-form" @submit.prevent="handleCreateCategory">
          <input v-model="newCategoryName" type="text" placeholder="New category" :disabled="creatingCategory" />
          <div class="reading-form-actions">
            <button
              class="button button-secondary reading-mini"
              type="button"
              @click="categoryFormOpen = false; newCategoryName = ''"
            >
              Cancel
            </button>
            <button class="button button-primary reading-mini" type="submit" :disabled="creatingCategory || !newCategoryName.trim()">
              Add
            </button>
          </div>
        </form>

        <div class="reading-category-list">
          <div v-for="category in store.categories" :key="category.id" class="reading-category">
            <div
              class="reading-category-row"
              :class="{ active: category.id === store.activeCategoryId }"
              @click="handleSelectCategory(category.id)"
            >
              <span class="reading-category-name">{{ category.name }}</span>
              <span class="reading-category-count">{{ category.articleCount ?? 0 }}</span>
              <button
                class="reading-plus"
                type="button"
                title="Add article"
                @click.stop="openArticleForm(category.id)"
              >
                +
              </button>
              <button
                v-if="category.name !== 'General'"
                class="reading-plus reading-minus"
                type="button"
                title="Delete category"
                @click.stop="handleDeleteCategory(category)"
              >
                ×
              </button>
            </div>

            <form
              v-if="articleFormCategoryId === category.id"
              class="reading-article-form"
              @submit.prevent="handleCreateArticle"
            >
              <input v-model="newArticleTitle" type="text" placeholder="Article title" :disabled="store.creatingArticle" />
              <textarea
                v-model="newArticleContent"
                rows="7"
                placeholder="Paste the article text. The AI splits it into numbered paragraphs."
                :disabled="store.creatingArticle"
              />
              <div class="reading-form-actions">
                <span class="muted-text">{{ newArticleContent.trim().length }} chars</span>
                <button class="button button-secondary reading-mini" type="button" @click="closeArticleForm">
                  Cancel
                </button>
                <button
                  class="button button-primary reading-mini"
                  type="submit"
                  :disabled="store.creatingArticle || !newArticleTitle.trim() || newArticleContent.trim().length < 40"
                >
                  {{ store.creatingArticle ? 'Segmenting…' : 'Generate' }}
                </button>
              </div>
            </form>

            <ul v-if="category.id === store.activeCategoryId" class="reading-article-list">
              <li v-if="store.loadingArticles" class="muted-text reading-list-hint">Loading…</li>
              <li v-else-if="store.articles.length === 0" class="muted-text reading-list-hint">
                No articles yet — use + above.
              </li>
              <li v-for="item in store.articles" :key="item.id">
                <button
                  class="reading-article-row"
                  :class="{ active: item.id === store.article?.id }"
                  type="button"
                  @click="store.selectArticle(item.id)"
                >
                  <span class="reading-article-title">{{ item.title }}</span>
                  <span class="reading-article-meta">
                    {{ item.paragraphCount }}¶ · {{ item.markCount }} marks
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- 2. Reader: numbered paragraphs with highlight / underline -->
      <article class="card reading-document" @mouseup="captureSelection" @keyup="captureSelection">
        <template v-if="store.article">
          <header class="reading-doc-head">
            <p class="eyebrow">{{ activeCategoryName }}</p>
            <h2>{{ store.article.title }}</h2>
            <p class="muted-text reading-doc-meta">
              {{ store.article.paragraphs.length }} paragraphs · {{ store.marks.length }} marks ·
              {{ store.notesCount }} notes
              <span v-if="store.article.segmentedBy === 'fallback'" class="reading-warn"> · local split</span>
            </p>
            <div class="reading-doc-actions">
              <button
                class="button button-secondary reading-mini"
                type="button"
                :disabled="store.resegmenting"
                @click="handleResegment"
              >
                {{ store.resegmenting ? 'Re-segmenting…' : 'Re-segment' }}
              </button>
              <button class="button button-secondary reading-mini" type="button" @click="handleDeleteArticle">
                Delete
              </button>
            </div>
          </header>

          <div class="reading-body">
            <div
              v-for="paragraph in store.article.paragraphs"
              :id="`reading-paragraph-${paragraph.index}`"
              :key="paragraph.index"
              class="reading-paragraph"
              :data-paragraph="paragraph.index"
            >
              <span class="reading-gutter">{{ paragraph.index }}</span>
              <p class="reading-text">
                <span
                  v-for="segment in segmentsFor(paragraph)"
                  :key="segment.key"
                  :class="segment.classes"
                  :data-mark="segment.markIds[0] || undefined"
                  :draggable="segment.markIds.length > 0 ? 'true' : 'false'"
                  @dragstart="handleSpanDrag($event, segment.markIds[0])"
                  @click="segment.markIds.length ? focusMark(segment.markIds[0]) : undefined"
                >{{ segment.text }}</span>
              </p>
            </div>
          </div>

          <p v-if="store.loadingArticle" class="muted-text">Loading article…</p>
        </template>

        <div v-else class="reading-empty">
          <p class="empty-copy">Pick an article on the left, or press + on a category to add one.</p>
        </div>
      </article>

      <!-- 3. Marks & sticky notes -->
      <aside class="card reading-rail">
        <div class="reading-pane-head">
          <div>
            <p class="eyebrow">Marks</p>
            <h2>{{ store.marks.length }}</h2>
          </div>
          <span class="muted-text">{{ store.notesCount }} notes</span>
        </div>

        <p v-if="store.marks.length === 0" class="empty-copy reading-rail-empty">
          Select text in the article, then highlight or underline it. Drag a card into the chat to quote it.
        </p>

        <div class="reading-mark-list">
          <ReadingMarkCard
            v-for="mark in store.marks"
            :key="mark.id"
            :mark="mark"
            :focused="focusedMarkId === mark.id"
            @save-note="handleSaveNote"
            @delete="handleDeleteMark"
            @cite="addCitation"
            @jump="jumpToMark"
            @focus="focusedMarkId = $event"
          />
        </div>
      </aside>

      <!-- 4. AI chat -->
      <section
        class="card reading-chat"
        :class="{ 'drop-active': dragOverChat }"
        @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <div class="reading-pane-head">
          <div>
            <p class="eyebrow">Assistant</p>
            <h2>Ask the article</h2>
          </div>
          <button
            class="button button-secondary reading-mini"
            type="button"
            :disabled="!store.article || store.article.chatHistory.length === 0 || store.streaming"
            @click="handleClearChat"
          >
            Clear
          </button>
        </div>

        <div ref="chatBodyRef" class="reading-chat-body">
          <p v-if="!chatMessages.length && !store.streaming" class="empty-copy">
            Ask about meaning, grammar or the argument. Drag a mark in to ground the answer.
          </p>

          <div v-for="message in chatMessages" :key="message.id" class="chat-bubble" :class="message.role">
            <p class="chat-role">{{ message.role === 'user' ? 'You' : 'AI' }}</p>
            <div
              v-if="message.role === 'assistant'"
              class="chat-content"
              v-html="renderMarkdown(message.content)"
            />
            <p v-else class="reading-chat-user-text">{{ message.content }}</p>
            <div v-if="message.citations?.length" class="reading-chat-citations">
              <span v-for="citation in message.citations" :key="citation.markId" class="reading-cite-chip">
                ¶{{ citation.paragraphIndex }}
              </span>
            </div>
          </div>

          <div v-if="store.streaming" class="chat-bubble assistant">
            <p class="chat-role">AI</p>
            <div v-if="store.streamText" class="chat-content" v-html="renderMarkdown(store.streamText)" />
            <p v-else class="muted-text">Thinking…</p>
          </div>
        </div>

        <div class="reading-composer">
          <div v-if="pendingCitations.length" class="reading-citation-strip">
            <span v-for="citation in pendingCitations" :key="citation.markId" class="reading-cite-chip">
              ¶{{ citation.paragraphIndex }}
              <span class="reading-cite-quote">{{ shorten(citation.text, 32) }}</span>
              <button type="button" title="Remove" @click="removeCitation(citation.markId)">×</button>
            </span>
          </div>

          <textarea
            ref="composerRef"
            v-model="draft"
            rows="3"
            class="reading-composer-input"
            placeholder="Ask about this article… (or drop a highlight here)"
            :disabled="!store.article || store.streaming"
            @keydown.enter.exact.prevent="handleSend"
          />

          <div class="reading-composer-actions">
            <span class="muted-text">Enter to send · Shift+Enter newline</span>
            <button
              class="button button-primary reading-mini"
              type="button"
              :disabled="!store.article || store.streaming || !draft.trim()"
              @click="handleSend"
            >
              {{ store.streaming ? 'Streaming…' : 'Send' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="selection"
      class="reading-selection-bar"
      :style="{ top: `${selection.top}px`, left: `${selection.left}px` }"
      @mousedown.prevent
    >
      <button type="button" @click="createMark('highlight')">Highlight</button>
      <button type="button" @click="createMark('underline')">Underline</button>
      <button type="button" class="reading-selection-primary" @click="askAboutSelection">Ask AI</button>
    </div>

    <p v-if="store.notice" class="success-text reading-flash">{{ store.notice }}</p>
    <p v-if="store.error" class="error-text reading-flash">{{ store.error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ReadingMarkCard from '@/components/ReadingMarkCard.vue';
import { useReadingStore } from '@/stores/reading';
import { renderMarkdown } from '@/utils/markdown';
import type { ReadingCitation, ReadingMark, ReadingMarkKind, ReadingParagraph } from '@/types/models';

interface Segment {
  key: string;
  text: string;
  classes: string;
  markIds: string[];
}

interface PendingSelection {
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  top: number;
  left: number;
}

const store = useReadingStore();

const categoryFormOpen = ref(false);
const newCategoryName = ref('');
const creatingCategory = ref(false);

const articleFormCategoryId = ref('');
const newArticleTitle = ref('');
const newArticleContent = ref('');

const selection = ref<PendingSelection | null>(null);
const focusedMarkId = ref('');
const pendingCitations = ref<ReadingCitation[]>([]);
const draft = ref('');
const dragOverChat = ref(false);

const chatBodyRef = ref<HTMLElement | null>(null);
const composerRef = ref<HTMLTextAreaElement | null>(null);

const chatMessages = computed(() => store.article?.chatHistory ?? []);
const activeCategoryName = computed(
  () => store.categories.find((category) => category.id === store.activeCategoryId)?.name ?? '',
);

function shorten(value: string, max: number) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function clampOffset(value: number, length: number) {
  return Math.max(0, Math.min(value, length));
}

/** Split one paragraph into text runs at mark boundaries so overlapping
 *  highlights and underlines can be rendered without nested DOM surgery. */
function segmentsFor(paragraph: ReadingParagraph): Segment[] {
  const text = paragraph.text;
  const relevant = store.marks
    .filter((mark) => mark.paragraphIndex === paragraph.index)
    .sort((a, b) => a.startOffset - b.startOffset);

  if (relevant.length === 0) {
    return [{ key: `${paragraph.index}-0`, text, classes: 'reading-seg', markIds: [] }];
  }

  const points = new Set<number>([0, text.length]);
  for (const mark of relevant) {
    points.add(clampOffset(mark.startOffset, text.length));
    points.add(clampOffset(mark.endOffset, text.length));
  }

  const ordered = [...points].sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index];
    const end = ordered[index + 1];
    if (end <= start) {
      continue;
    }

    const covering = relevant.filter(
      (mark) => mark.startOffset <= start && mark.endOffset >= end,
    );
    const classes = ['reading-seg'];
    if (covering.some((mark) => mark.kind === 'highlight')) {
      classes.push('mark-highlight');
    }
    if (covering.some((mark) => mark.kind === 'underline')) {
      classes.push('mark-underline');
    }

    segments.push({
      key: `${paragraph.index}-${start}`,
      text: text.slice(start, end),
      classes: classes.join(' '),
      markIds: covering.map((mark) => mark.id),
    });
  }

  return segments;
}

/** Character offset of `node`/`offset` measured from the start of `root`. */
function offsetWithin(root: HTMLElement, node: Node, offset: number): number | null {
  try {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    return null;
  }
}

function elementOf(node: Node | null): Element | null {
  if (!node) {
    return null;
  }
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function captureSelection() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
    return;
  }

  const range = sel.getRangeAt(0);
  const startText = elementOf(range.startContainer)?.closest('.reading-text') as HTMLElement | null;
  const endText = elementOf(range.endContainer)?.closest('.reading-text') as HTMLElement | null;
  if (!startText || !endText || startText !== endText) {
    selection.value = null;
    return;
  }

  const text = sel.toString().replace(/\u00a0/g, ' ').trim();
  if (!text) {
    selection.value = null;
    return;
  }

  const startOffset = offsetWithin(startText, range.startContainer, range.startOffset);
  const endOffset = offsetWithin(startText, range.endContainer, range.endOffset);
  if (startOffset === null || endOffset === null || endOffset <= startOffset) {
    selection.value = null;
    return;
  }

  const paragraphIndex = Number(
    startText.closest('[data-paragraph]')?.getAttribute('data-paragraph') ?? 0,
  );
  if (!paragraphIndex) {
    return;
  }

  const rect = range.getBoundingClientRect();
  selection.value = {
    paragraphIndex,
    startOffset,
    endOffset,
    text,
    top: Math.max(8, rect.top - 46),
    left: Math.max(8, Math.min(window.innerWidth - 300, rect.left)),
  };
}

function clearSelection() {
  window.getSelection()?.removeAllRanges();
  selection.value = null;
}

async function createMark(kind: ReadingMarkKind) {
  const current = selection.value;
  if (!current) {
    return;
  }
  try {
    const mark = await store.addMark({
      kind,
      paragraphIndex: current.paragraphIndex,
      startOffset: current.startOffset,
      endOffset: current.endOffset,
    });
    clearSelection();
    if (mark) {
      focusedMarkId.value = mark.id;
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to create mark.');
  }
}

async function askAboutSelection() {
  const current = selection.value;
  if (!current) {
    return;
  }
  try {
    const mark = await store.addMark({
      kind: 'highlight',
      paragraphIndex: current.paragraphIndex,
      startOffset: current.startOffset,
      endOffset: current.endOffset,
    });
    clearSelection();
    if (!mark) {
      return;
    }
    addCitation(mark);
    composerRef.value?.focus();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to create mark.');
  }
}

function addCitation(mark: ReadingMark) {
  if (pendingCitations.value.some((citation) => citation.markId === mark.id)) {
    return;
  }
  pendingCitations.value = [
    ...pendingCitations.value,
    {
      markId: mark.id,
      paragraphIndex: mark.paragraphIndex,
      text: mark.text,
      ...(mark.note.trim() ? { note: mark.note.trim() } : {}),
    },
  ];
  focusedMarkId.value = mark.id;
  composerRef.value?.focus();
}

function removeCitation(markId: string) {
  pendingCitations.value = pendingCitations.value.filter((citation) => citation.markId !== markId);
}

function handleSpanDrag(event: DragEvent, markId: string) {
  if (!markId || !event.dataTransfer) {
    return;
  }
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/x-reading-mark', markId);
  event.dataTransfer.setData('text/plain', '');
}

function handleDragOver(event: DragEvent) {
  dragOverChat.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

function handleDragLeave() {
  dragOverChat.value = false;
}

function handleDrop(event: DragEvent) {
  dragOverChat.value = false;
  const markId = event.dataTransfer?.getData('application/x-reading-mark') ?? '';
  const mark = store.marks.find((item) => item.id === markId);
  if (mark) {
    addCitation(mark);
    return;
  }

  const text = event.dataTransfer?.getData('text/plain')?.trim() ?? '';
  if (text) {
    draft.value = draft.value.trim() ? `${draft.value.trim()}\n> ${text}\n\n` : `> ${text}\n\n`;
    composerRef.value?.focus();
  }
}

function jumpToMark(mark: ReadingMark) {
  focusedMarkId.value = mark.id;
  const target = document.getElementById(`reading-paragraph-${mark.paragraphIndex}`);
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target?.classList.remove('reading-flash-paragraph');
  void target?.offsetWidth;
  target?.classList.add('reading-flash-paragraph');
}

function focusMark(markId: string) {
  focusedMarkId.value = markId;
}

async function handleSaveNote(markId: string, note: string) {
  try {
    await store.saveNote(markId, note);
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to save note.');
  }
}

async function handleDeleteMark(markId: string) {
  try {
    await store.deleteMark(markId);
    pendingCitations.value = pendingCitations.value.filter((citation) => citation.markId !== markId);
    if (focusedMarkId.value === markId) {
      focusedMarkId.value = '';
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to delete mark.');
  }
}

async function handleSend() {
  const message = draft.value.trim();
  if (!message || store.streaming || !store.article) {
    return;
  }

  const citations = pendingCitations.value;
  draft.value = '';
  pendingCitations.value = [];
  await store.sendChat({ message, citations });
}

async function handleCreateCategory() {
  const name = newCategoryName.value.trim();
  if (!name) {
    return;
  }
  creatingCategory.value = true;
  try {
    await store.createCategory(name);
    newCategoryName.value = '';
    categoryFormOpen.value = false;
    await store.loadArticles();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to create category.');
  } finally {
    creatingCategory.value = false;
  }
}

async function handleClearChat() {
  try {
    await store.clearChat();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to clear the conversation.');
  }
}

async function handleDeleteCategory(category: { id: string; name: string; articleCount?: number }) {
  if ((category.articleCount ?? 0) > 0) {
    store.setError(`"${category.name}" still has articles. Delete or move them first.`);
    return;
  }
  if (!window.confirm(`Delete the category "${category.name}"?`)) {
    return;
  }
  try {
    await store.deleteCategory(category.id);
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to delete category.');
  }
}

async function handleSelectCategory(categoryId: string) {
  await store.selectCategory(categoryId);
}

function openArticleForm(categoryId: string) {
  articleFormCategoryId.value = categoryId;
  newArticleTitle.value = '';
  newArticleContent.value = '';
  if (categoryId !== store.activeCategoryId) {
    void handleSelectCategory(categoryId);
  }
}

function closeArticleForm() {
  articleFormCategoryId.value = '';
  newArticleTitle.value = '';
  newArticleContent.value = '';
}

async function handleCreateArticle() {
  if (!articleFormCategoryId.value) {
    return;
  }
  try {
    await store.createArticle({
      categoryId: articleFormCategoryId.value,
      title: newArticleTitle.value,
      content: newArticleContent.value,
    });
    closeArticleForm();
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unable to create article.');
  }
}

function handleDeleteArticle() {
  if (!store.article) {
    return;
  }
  if (window.confirm(`Delete "${store.article.title}" and its marks?`)) {
    void store.deleteArticle(store.article.id);
  }
}

function handleResegment() {
  if (!store.article) {
    return;
  }
  if (window.confirm('Re-segment this article? Existing marks are cleared because paragraph numbering changes.')) {
    void store.resegmentArticle();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    selection.value = null;
  }
}

watch(
  () => [chatMessages.value.length, store.streamText] as const,
  async () => {
    await nextTick();
    const body = chatBodyRef.value;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  },
);

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  await store.loadCategories();
  await store.loadArticles();
  const first = store.articles[0];
  if (first) {
    await store.selectArticle(first.id);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>