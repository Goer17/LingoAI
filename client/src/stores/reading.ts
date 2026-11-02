import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import type {
  ReadingArticle,
  ReadingArticleSummary,
  ReadingCategory,
  ReadingChatMessage,
  ReadingCitation,
  ReadingMark,
  ReadingMarkKind,
} from '@/types/models';

/** Marks sorted the way the notes rail shows them: by paragraph, then position. */
function sortMarks(marks: ReadingMark[]) {
  return [...marks].sort((a, b) =>
    a.paragraphIndex - b.paragraphIndex
    || a.startOffset - b.startOffset
    || a.createdAt.localeCompare(b.createdAt),
  );
}

export const useReadingStore = defineStore('reading', () => {
  const categories = ref<ReadingCategory[]>([]);
  const articles = ref<ReadingArticleSummary[]>([]);
  const activeCategoryId = ref('');
  const article = ref<ReadingArticle | null>(null);
  const marks = ref<ReadingMark[]>([]);

  const loadingCategories = ref(false);
  const loadingArticles = ref(false);
  const loadingArticle = ref(false);
  const creatingArticle = ref(false);
  const resegmenting = ref(false);
  const streaming = ref(false);
  const streamText = ref('');

  const error = ref('');
  const notice = ref('');

  /** Marks grouped by paragraph, used by the notes rail and the reader. */
  const marksByParagraph = computed(() => {
    const grouped = new Map<number, ReadingMark[]>();
    for (const mark of marks.value) {
      const bucket = grouped.get(mark.paragraphIndex);
      if (bucket) {
        bucket.push(mark);
      } else {
        grouped.set(mark.paragraphIndex, [mark]);
      }
    }
    return grouped;
  });

  const notesCount = computed(() => marks.value.filter((mark) => mark.note.trim()).length);

  function setError(message: string) {
    error.value = message;
    notice.value = '';
  }

  function setNotice(message: string) {
    notice.value = message;
    error.value = '';
  }

  function clearMessages() {
    error.value = '';
    notice.value = '';
  }

  async function loadCategories() {
    loadingCategories.value = true;
    try {
      const data = await api.listReadingCategories();
      categories.value = data;
      if (!activeCategoryId.value || !data.some((category) => category.id === activeCategoryId.value)) {
        activeCategoryId.value = data[0]?.id ?? '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load categories.');
    } finally {
      loadingCategories.value = false;
    }
  }

  async function loadArticles() {
    loadingArticles.value = true;
    try {
      articles.value = await api.listReadingArticles(activeCategoryId.value || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load articles.');
    } finally {
      loadingArticles.value = false;
    }
  }

  async function selectCategory(categoryId: string) {
    if (activeCategoryId.value === categoryId) {
      return;
    }
    activeCategoryId.value = categoryId;
    await loadArticles();
  }

  async function createCategory(name: string) {
    const created = await api.createReadingCategory(name);
    categories.value = [...categories.value, { ...created, articleCount: 0 }];
    activeCategoryId.value = created.id;
    articles.value = [];
    setNotice(`Category "${created.name}" created.`);
    return created;
  }

  async function deleteCategory(categoryId: string) {
    await api.deleteReadingCategory(categoryId);
    await loadCategories();
    await loadArticles();
    setNotice('Category deleted.');
  }

  async function createArticle(payload: { categoryId: string; title: string; content: string }) {
    creatingArticle.value = true;
    clearMessages();
    try {
      const created = await api.createReadingArticle(payload);
      activeCategoryId.value = created.categoryId;
      await loadCategories();
      await loadArticles();
      await selectArticle(created.id);
      setNotice(
        created.segmentedBy === 'ai'
          ? `Article segmented into ${created.paragraphs.length} paragraphs.`
          : 'The language model was unavailable; split into paragraphs locally.',
      );
      return created;
    } finally {
      creatingArticle.value = false;
    }
  }

  async function selectArticle(articleId: string) {
    loadingArticle.value = true;
    try {
      const bundle = await api.getReadingArticle(articleId);
      article.value = bundle.article;
      marks.value = sortMarks(bundle.marks);
      streamText.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open article.');
    } finally {
      loadingArticle.value = false;
    }
  }

  async function deleteArticle(articleId: string) {
    await api.deleteReadingArticle(articleId);
    if (article.value?.id === articleId) {
      article.value = null;
      marks.value = [];
    }
    await loadCategories();
    await loadArticles();
    setNotice('Article deleted.');
  }

  async function resegmentArticle() {
    if (!article.value) {
      return;
    }
    resegmenting.value = true;
    clearMessages();
    try {
      const updated = await api.resegmentReadingArticle(article.value.id);
      article.value = updated;
      marks.value = [];
      setNotice(
        updated.segmentedBy === 'ai'
          ? `Re-segmented into ${updated.paragraphs.length} paragraphs. Marks were reset.`
          : 'The language model was unavailable; split locally. Marks were reset.',
      );
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to re-segment article.');
    } finally {
      resegmenting.value = false;
    }
  }

  async function addMark(input: {
    kind: ReadingMarkKind;
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
  }) {
    if (!article.value) {
      return null;
    }
    const mark = await api.addReadingMark(article.value.id, input);
    marks.value = sortMarks([...marks.value, mark]);
    bumpMarkCount(article.value.id, 1);
    return mark;
  }

  async function saveNote(markId: string, note: string) {
    const updated = await api.updateReadingMarkNote(markId, note);
    marks.value = sortMarks(marks.value.map((mark) => (mark.id === markId ? updated : mark)));
    return updated;
  }

  async function deleteMark(markId: string) {
    await api.deleteReadingMark(markId);
    marks.value = marks.value.filter((mark) => mark.id !== markId);
    if (article.value) {
      bumpMarkCount(article.value.id, -1);
    }
  }

  /** Keep the library row's mark counter in sync without refetching. */
  function bumpMarkCount(articleId: string, delta: number) {
    articles.value = articles.value.map((item) =>
      item.id === articleId
        ? { ...item, markCount: Math.max(0, item.markCount + delta) }
        : item,
    );
  }

  async function clearChat() {
    if (!article.value) {
      return;
    }
    const result = await api.clearReadingChat(article.value.id);
    article.value = { ...article.value, chatHistory: result.chatHistory };
  }

  /** Send one chat turn: push the user message optimistically, then stream the
   *  reply into `streamText` and replace history with the server copy at the end
   *  so message ids stay canonical. */
  async function sendChat(input: { message: string; citations: ReadingCitation[] }) {
    if (!article.value || streaming.value) {
      return;
    }

    const current = article.value;
    const now = new Date().toISOString();
    const optimistic: ReadingChatMessage = {
      id: `pending-${now}`,
      role: 'user',
      content: input.message,
      createdAt: now,
      ...(input.citations.length ? { citations: input.citations } : {}),
    };

    article.value = { ...current, chatHistory: [...current.chatHistory, optimistic] };
    streaming.value = true;
    streamText.value = '';
    clearMessages();

    try {
      await api.streamReadingChat(
        current.id,
        input.message,
        input.citations.map((citation) => citation.markId),
        {
          onDelta: (chunk) => {
            streamText.value += chunk;
          },
          onDone: ({ chatHistory }) => {
            if (article.value) {
              article.value = { ...article.value, chatHistory };
            }
          },
        },
      );
      if (!article.value?.chatHistory.some((message) => message.role === 'assistant')) {
        throw new Error('The assistant reply was empty.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reading chat failed.');
      // Drop the optimistic turn when the server never recorded the answer.
      if (article.value) {
        article.value = {
          ...article.value,
          chatHistory: article.value.chatHistory.filter((message) => message.id !== optimistic.id),
        };
      }
    } finally {
      streaming.value = false;
      streamText.value = '';
    }
  }

  return {
    categories,
    articles,
    activeCategoryId,
    article,
    marks,
    marksByParagraph,
    notesCount,
    loadingCategories,
    loadingArticles,
    loadingArticle,
    creatingArticle,
    resegmenting,
    streaming,
    streamText,
    error,
    notice,
    loadCategories,
    loadArticles,
    selectCategory,
    createCategory,
    deleteCategory,
    createArticle,
    selectArticle,
    deleteArticle,
    resegmentArticle,
    addMark,
    saveNote,
    deleteMark,
    clearChat,
    sendChat,
    setError,
    setNotice,
    clearMessages,
  };
});