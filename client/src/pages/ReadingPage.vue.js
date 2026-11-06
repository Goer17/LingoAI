import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ReadingMarkCard from '@/components/ReadingMarkCard.vue';
import { useReadingStore } from '@/stores/reading';
import { renderMarkdown } from '@/utils/markdown';
const store = useReadingStore();
const categoryFormOpen = ref(false);
const newCategoryName = ref('');
const creatingCategory = ref(false);
const articleFormCategoryId = ref('');
const newArticleTitle = ref('');
const newArticleContent = ref('');
const selection = ref(null);
const focusedMarkId = ref('');
const pendingCitations = ref([]);
const draft = ref('');
const dragOverChat = ref(false);
const chatBodyRef = ref(null);
const composerRef = ref(null);
const selectionBarRef = ref(null);
const gridRef = ref(null);
const gridStyle = ref(undefined);
const chatMessages = computed(() => store.article?.chatHistory ?? []);
const activeCategoryName = computed(() => store.categories.find((category) => category.id === store.activeCategoryId)?.name ?? '');
function shorten(value, max) {
    const text = value.replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function clampOffset(value, length) {
    return Math.max(0, Math.min(value, length));
}
/** Split one paragraph into text runs at mark boundaries so overlapping
 *  highlights and underlines can be rendered without nested DOM surgery. */
function segmentsFor(paragraph) {
    const text = paragraph.text;
    const relevant = store.marks
        .filter((mark) => mark.paragraphIndex === paragraph.index)
        .sort((a, b) => a.startOffset - b.startOffset);
    if (relevant.length === 0) {
        return [{ key: `${paragraph.index}-0`, text, classes: 'reading-seg', markIds: [] }];
    }
    const points = new Set([0, text.length]);
    for (const mark of relevant) {
        points.add(clampOffset(mark.startOffset, text.length));
        points.add(clampOffset(mark.endOffset, text.length));
    }
    const ordered = [...points].sort((a, b) => a - b);
    const segments = [];
    for (let index = 0; index < ordered.length - 1; index += 1) {
        const start = ordered[index];
        const end = ordered[index + 1];
        if (end <= start) {
            continue;
        }
        const covering = relevant.filter((mark) => mark.startOffset <= start && mark.endOffset >= end);
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
function offsetWithin(root, node, offset) {
    try {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.setEnd(node, offset);
        return range.toString().length;
    }
    catch {
        return null;
    }
}
function elementOf(node) {
    if (!node) {
        return null;
    }
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}
function captureSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        return;
    }
    const range = sel.getRangeAt(0);
    const startText = elementOf(range.startContainer)?.closest('.reading-text');
    const endText = elementOf(range.endContainer)?.closest('.reading-text');
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
    const paragraphIndex = Number(startText.closest('[data-paragraph]')?.getAttribute('data-paragraph') ?? 0);
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
async function createMark(kind) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        store.setError(error instanceof Error ? error.message : 'Unable to create mark.');
    }
}
function addCitation(mark) {
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
function removeCitation(markId) {
    pendingCitations.value = pendingCitations.value.filter((citation) => citation.markId !== markId);
}
function handleSpanDrag(event, markId) {
    if (!markId || !event.dataTransfer) {
        return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-reading-mark', markId);
    event.dataTransfer.setData('text/plain', '');
}
function handleDragOver(event) {
    dragOverChat.value = true;
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
    }
}
function handleDragLeave() {
    dragOverChat.value = false;
}
function handleDrop(event) {
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
function jumpToMark(mark) {
    focusedMarkId.value = mark.id;
    const target = document.getElementById(`reading-paragraph-${mark.paragraphIndex}`);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.classList.remove('reading-flash-paragraph');
    void target?.offsetWidth;
    target?.classList.add('reading-flash-paragraph');
}
function focusMark(markId) {
    focusedMarkId.value = markId;
}
async function handleSaveNote(markId, note) {
    try {
        await store.saveNote(markId, note);
    }
    catch (error) {
        store.setError(error instanceof Error ? error.message : 'Unable to save note.');
    }
}
async function handleDeleteMark(markId) {
    try {
        await store.deleteMark(markId);
        pendingCitations.value = pendingCitations.value.filter((citation) => citation.markId !== markId);
        if (focusedMarkId.value === markId) {
            focusedMarkId.value = '';
        }
    }
    catch (error) {
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
    }
    catch (error) {
        store.setError(error instanceof Error ? error.message : 'Unable to create category.');
    }
    finally {
        creatingCategory.value = false;
    }
}
async function handleClearChat() {
    try {
        await store.clearChat();
    }
    catch (error) {
        store.setError(error instanceof Error ? error.message : 'Unable to clear the conversation.');
    }
}
async function handleDeleteCategory(category) {
    if ((category.articleCount ?? 0) > 0) {
        store.setError(`"${category.name}" still has articles. Delete or move them first.`);
        return;
    }
    if (!window.confirm(`Delete the category "${category.name}"?`)) {
        return;
    }
    try {
        await store.deleteCategory(category.id);
    }
    catch (error) {
        store.setError(error instanceof Error ? error.message : 'Unable to delete category.');
    }
}
async function handleSelectCategory(categoryId) {
    await store.selectCategory(categoryId);
}
function openArticleForm(categoryId) {
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
    }
    catch (error) {
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
/**
 * Pin the workspace to the viewport so the reader and the chat pane scroll
 * their own content instead of stretching the page as the chat log grows.
 * Measured at runtime because the sticky top bar changes height when the nav
 * wraps; a hard-coded `calc(100vh - Npx)` is wrong at those widths.
 */
function syncGridHeight() {
    const el = gridRef.value;
    if (!el || window.innerWidth <= 640) {
        gridStyle.value = undefined;
        return;
    }
    const top = el.getBoundingClientRect().top + window.scrollY;
    const available = Math.round(window.innerHeight - top - 20);
    gridStyle.value = { height: `${Math.max(320, available)}px` };
}
function handleKeydown(event) {
    if (event.key === 'Escape') {
        selection.value = null;
    }
}
/** Clicking anywhere outside the floating selection toolbar dismisses it, so a
 *  stale "Highlight / Underline / Ask AI" bar never stays on screen. */
function handleDocumentPointerDown(event) {
    if (!selection.value) {
        return;
    }
    const target = event.target;
    if (target && selectionBarRef.value?.contains(target)) {
        return;
    }
    selection.value = null;
}
watch(() => [chatMessages.value.length, store.streamText], async () => {
    await nextTick();
    const body = chatBodyRef.value;
    if (body) {
        body.scrollTop = body.scrollHeight;
    }
});
onMounted(async () => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', syncGridHeight);
    document.addEventListener('pointerdown', handleDocumentPointerDown);
    await store.loadCategories();
    await store.loadArticles();
    const first = store.articles[0];
    if (first) {
        await store.selectArticle(first.id);
    }
    await nextTick();
    syncGridHeight();
});
onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', syncGridHeight);
    document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "reading-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "gridRef",
    ...{ class: "reading-grid" },
    ...{ style: (__VLS_ctx.gridStyle) },
});
/** @type {typeof __VLS_ctx.gridRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "card reading-library" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-pane-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
if (!__VLS_ctx.categoryFormOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.categoryFormOpen))
                    return;
                __VLS_ctx.categoryFormOpen = true;
            } },
        ...{ class: "button button-secondary reading-mini" },
        type: "button",
    });
}
if (__VLS_ctx.categoryFormOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleCreateCategory) },
        ...{ class: "reading-inline-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.newCategoryName),
        type: "text",
        placeholder: "New category",
        disabled: (__VLS_ctx.creatingCategory),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reading-form-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.categoryFormOpen))
                    return;
                __VLS_ctx.categoryFormOpen = false;
                __VLS_ctx.newCategoryName = '';
            } },
        ...{ class: "button button-secondary reading-mini" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "button button-primary reading-mini" },
        type: "submit",
        disabled: (__VLS_ctx.creatingCategory || !__VLS_ctx.newCategoryName.trim()),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-category-list" },
});
for (const [category] of __VLS_getVForSourceType((__VLS_ctx.store.categories))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (category.id),
        ...{ class: "reading-category" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleSelectCategory(category.id);
            } },
        ...{ class: "reading-category-row" },
        ...{ class: ({ active: category.id === __VLS_ctx.store.activeCategoryId }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "reading-category-name" },
    });
    (category.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "reading-category-count" },
    });
    (category.articleCount ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openArticleForm(category.id);
            } },
        ...{ class: "reading-plus" },
        type: "button",
        title: "Add article",
    });
    if (category.name !== 'General') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(category.name !== 'General'))
                        return;
                    __VLS_ctx.handleDeleteCategory(category);
                } },
            ...{ class: "reading-plus reading-minus" },
            type: "button",
            title: "Delete category",
        });
    }
    if (__VLS_ctx.articleFormCategoryId === category.id) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.handleCreateArticle) },
            ...{ class: "reading-article-form" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.newArticleTitle),
            type: "text",
            placeholder: "Article title",
            disabled: (__VLS_ctx.store.creatingArticle),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.newArticleContent),
            rows: "7",
            placeholder: "Paste the article text. The AI splits it into numbered paragraphs.",
            disabled: (__VLS_ctx.store.creatingArticle),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reading-form-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted-text" },
        });
        (__VLS_ctx.newArticleContent.trim().length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeArticleForm) },
            ...{ class: "button button-secondary reading-mini" },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "button button-primary reading-mini" },
            type: "submit",
            disabled: (__VLS_ctx.store.creatingArticle || !__VLS_ctx.newArticleTitle.trim() || __VLS_ctx.newArticleContent.trim().length < 40),
        });
        (__VLS_ctx.store.creatingArticle ? 'Segmenting…' : 'Generate');
    }
    if (category.id === __VLS_ctx.store.activeCategoryId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "reading-article-list" },
        });
        if (__VLS_ctx.store.loadingArticles) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                ...{ class: "muted-text reading-list-hint" },
            });
        }
        else if (__VLS_ctx.store.articles.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                ...{ class: "muted-text reading-list-hint" },
            });
        }
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.store.articles))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(category.id === __VLS_ctx.store.activeCategoryId))
                            return;
                        __VLS_ctx.store.selectArticle(item.id);
                    } },
                ...{ class: "reading-article-row" },
                ...{ class: ({ active: item.id === __VLS_ctx.store.article?.id }) },
                type: "button",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "reading-article-title" },
            });
            (item.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "reading-article-meta" },
            });
            (item.paragraphCount);
            (item.markCount);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ onMouseup: (__VLS_ctx.captureSelection) },
    ...{ onKeyup: (__VLS_ctx.captureSelection) },
    ...{ class: "card reading-document" },
});
if (__VLS_ctx.store.article) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "reading-doc-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    (__VLS_ctx.activeCategoryName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.store.article.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "muted-text reading-doc-meta" },
    });
    (__VLS_ctx.store.article.paragraphs.length);
    (__VLS_ctx.store.marks.length);
    (__VLS_ctx.store.notesCount);
    if (__VLS_ctx.store.article.segmentedBy === 'fallback') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "reading-warn" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reading-doc-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleResegment) },
        ...{ class: "button button-secondary reading-mini" },
        type: "button",
        disabled: (__VLS_ctx.store.resegmenting),
    });
    (__VLS_ctx.store.resegmenting ? 'Re-segmenting…' : 'Re-segment');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleDeleteArticle) },
        ...{ class: "button button-secondary reading-mini" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reading-body" },
    });
    for (const [paragraph] of __VLS_getVForSourceType((__VLS_ctx.store.article.paragraphs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            id: (`reading-paragraph-${paragraph.index}`),
            key: (paragraph.index),
            ...{ class: "reading-paragraph" },
            'data-paragraph': (paragraph.index),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "reading-gutter" },
        });
        (paragraph.index);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "reading-text" },
        });
        for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segmentsFor(paragraph)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.store.article))
                            return;
                        __VLS_ctx.handleSpanDrag($event, segment.markIds[0]);
                    } },
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.store.article))
                            return;
                        segment.markIds.length ? __VLS_ctx.focusMark(segment.markIds[0]) : undefined;
                    } },
                key: (segment.key),
                ...{ class: (segment.classes) },
                'data-mark': (segment.markIds[0] || undefined),
                draggable: (segment.markIds.length > 0 ? 'true' : 'false'),
            });
            (segment.text);
        }
    }
    if (__VLS_ctx.store.loadingArticle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reading-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "card reading-rail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-pane-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.store.marks.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "muted-text" },
});
(__VLS_ctx.store.notesCount);
if (__VLS_ctx.store.marks.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy reading-rail-empty" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-mark-list" },
});
for (const [mark] of __VLS_getVForSourceType((__VLS_ctx.store.marks))) {
    /** @type {[typeof ReadingMarkCard, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ReadingMarkCard, new ReadingMarkCard({
        ...{ 'onSaveNote': {} },
        ...{ 'onDelete': {} },
        ...{ 'onCite': {} },
        ...{ 'onJump': {} },
        ...{ 'onFocus': {} },
        key: (mark.id),
        mark: (mark),
        focused: (__VLS_ctx.focusedMarkId === mark.id),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSaveNote': {} },
        ...{ 'onDelete': {} },
        ...{ 'onCite': {} },
        ...{ 'onJump': {} },
        ...{ 'onFocus': {} },
        key: (mark.id),
        mark: (mark),
        focused: (__VLS_ctx.focusedMarkId === mark.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSaveNote: (__VLS_ctx.handleSaveNote)
    };
    const __VLS_7 = {
        onDelete: (__VLS_ctx.handleDeleteMark)
    };
    const __VLS_8 = {
        onCite: (__VLS_ctx.addCitation)
    };
    const __VLS_9 = {
        onJump: (__VLS_ctx.jumpToMark)
    };
    const __VLS_10 = {
        onFocus: (...[$event]) => {
            __VLS_ctx.focusedMarkId = $event;
        }
    };
    var __VLS_2;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ onDragover: (__VLS_ctx.handleDragOver) },
    ...{ onDragleave: (__VLS_ctx.handleDragLeave) },
    ...{ onDrop: (__VLS_ctx.handleDrop) },
    ...{ class: "card reading-chat" },
    ...{ class: ({ 'drop-active': __VLS_ctx.dragOverChat }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-pane-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleClearChat) },
    ...{ class: "button button-secondary reading-mini" },
    type: "button",
    disabled: (!__VLS_ctx.store.article || __VLS_ctx.store.article.chatHistory.length === 0 || __VLS_ctx.store.streaming),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "chatBodyRef",
    ...{ class: "reading-chat-body" },
});
/** @type {typeof __VLS_ctx.chatBodyRef} */ ;
if (!__VLS_ctx.chatMessages.length && !__VLS_ctx.store.streaming) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
for (const [message] of __VLS_getVForSourceType((__VLS_ctx.chatMessages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (message.id),
        ...{ class: "chat-bubble" },
        ...{ class: (message.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "chat-role" },
    });
    (message.role === 'user' ? 'You' : 'AI');
    if (message.role === 'assistant') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "chat-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(message.content)) }, null, null);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "reading-chat-user-text" },
        });
        (message.content);
    }
    if (message.citations?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reading-chat-citations" },
        });
        for (const [citation] of __VLS_getVForSourceType((message.citations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (citation.markId),
                ...{ class: "reading-cite-chip" },
            });
            (citation.paragraphIndex);
        }
    }
}
if (__VLS_ctx.store.streaming) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-bubble assistant" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "chat-role" },
    });
    if (__VLS_ctx.store.streamText) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "chat-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(__VLS_ctx.store.streamText)) }, null, null);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-composer" },
});
if (__VLS_ctx.pendingCitations.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reading-citation-strip" },
    });
    for (const [citation] of __VLS_getVForSourceType((__VLS_ctx.pendingCitations))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (citation.markId),
            ...{ class: "reading-cite-chip" },
        });
        (citation.paragraphIndex);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "reading-cite-quote" },
        });
        (__VLS_ctx.shorten(citation.text, 32));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.pendingCitations.length))
                        return;
                    __VLS_ctx.removeCitation(citation.markId);
                } },
            type: "button",
            title: "Remove",
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleSend) },
    ref: "composerRef",
    value: (__VLS_ctx.draft),
    rows: "3",
    ...{ class: "reading-composer-input" },
    placeholder: "Ask about this article… (or drop a highlight here)",
    disabled: (!__VLS_ctx.store.article || __VLS_ctx.store.streaming),
});
/** @type {typeof __VLS_ctx.composerRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reading-composer-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "muted-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleSend) },
    ...{ class: "button button-primary reading-mini" },
    type: "button",
    disabled: (!__VLS_ctx.store.article || __VLS_ctx.store.streaming || !__VLS_ctx.draft.trim()),
});
(__VLS_ctx.store.streaming ? 'Streaming…' : 'Send');
if (__VLS_ctx.selection) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: () => { } },
        ref: "selectionBarRef",
        ...{ class: "reading-selection-bar" },
        ...{ style: ({ top: `${__VLS_ctx.selection.top}px`, left: `${__VLS_ctx.selection.left}px` }) },
    });
    /** @type {typeof __VLS_ctx.selectionBarRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selection))
                    return;
                __VLS_ctx.createMark('highlight');
            } },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selection))
                    return;
                __VLS_ctx.createMark('underline');
            } },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.askAboutSelection) },
        type: "button",
        ...{ class: "reading-selection-primary" },
    });
}
if (__VLS_ctx.store.notice) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "success-text reading-flash" },
    });
    (__VLS_ctx.store.notice);
}
if (__VLS_ctx.store.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text reading-flash" },
    });
    (__VLS_ctx.store.error);
}
/** @type {__VLS_StyleScopedClasses['reading-page']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-library']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-pane-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-inline-form']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-category-list']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-category']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-category-row']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-category-count']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-minus']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-article-form']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-article-list']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-list-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-list-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-article-row']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-article-title']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-article-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-document']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-doc-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-doc-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-warn']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-doc-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-body']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-paragraph']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-gutter']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-pane-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-rail-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mark-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-pane-head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-chat-body']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-role']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-chat-user-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-chat-citations']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-cite-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-role']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-content']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-composer']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-citation-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-cite-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-cite-quote']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-composer-input']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-composer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-mini']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-selection-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-selection-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-flash']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['reading-flash']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ReadingMarkCard: ReadingMarkCard,
            renderMarkdown: renderMarkdown,
            store: store,
            categoryFormOpen: categoryFormOpen,
            newCategoryName: newCategoryName,
            creatingCategory: creatingCategory,
            articleFormCategoryId: articleFormCategoryId,
            newArticleTitle: newArticleTitle,
            newArticleContent: newArticleContent,
            selection: selection,
            focusedMarkId: focusedMarkId,
            pendingCitations: pendingCitations,
            draft: draft,
            dragOverChat: dragOverChat,
            chatBodyRef: chatBodyRef,
            composerRef: composerRef,
            selectionBarRef: selectionBarRef,
            gridRef: gridRef,
            gridStyle: gridStyle,
            chatMessages: chatMessages,
            activeCategoryName: activeCategoryName,
            shorten: shorten,
            segmentsFor: segmentsFor,
            captureSelection: captureSelection,
            createMark: createMark,
            askAboutSelection: askAboutSelection,
            addCitation: addCitation,
            removeCitation: removeCitation,
            handleSpanDrag: handleSpanDrag,
            handleDragOver: handleDragOver,
            handleDragLeave: handleDragLeave,
            handleDrop: handleDrop,
            jumpToMark: jumpToMark,
            focusMark: focusMark,
            handleSaveNote: handleSaveNote,
            handleDeleteMark: handleDeleteMark,
            handleSend: handleSend,
            handleCreateCategory: handleCreateCategory,
            handleClearChat: handleClearChat,
            handleDeleteCategory: handleDeleteCategory,
            handleSelectCategory: handleSelectCategory,
            openArticleForm: openArticleForm,
            closeArticleForm: closeArticleForm,
            handleCreateArticle: handleCreateArticle,
            handleDeleteArticle: handleDeleteArticle,
            handleResegment: handleResegment,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
