import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import SentenceDetailPanel from '@/components/SentenceDetailPanel.vue';
import { useVocabularyStore } from '@/stores/vocabulary';
import { getStoredMediaAudioUrl } from '@/utils/audioCache';
const store = useVocabularyStore();
const router = useRouter();
const sentenceInput = ref('');
const error = ref('');
const message = ref('');
const adding = ref(false);
const taskLoading = ref(false);
const chatLoading = ref(false);
onMounted(async () => {
    try {
        await store.fetchListening();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load listening sentences.';
    }
});
async function handleAddSentence() {
    const sentence = sentenceInput.value.trim();
    if (!sentence) {
        return;
    }
    error.value = '';
    message.value = '';
    adding.value = true;
    try {
        const data = await store.addListeningSentence(sentence);
        message.value = data.created ? 'Sentence added.' : 'Sentence already exists.';
        sentenceInput.value = '';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to add sentence.';
    }
    finally {
        adding.value = false;
    }
}
async function playSentence(id, audioFile) {
    error.value = '';
    try {
        const directUrl = getStoredMediaAudioUrl(audioFile);
        const audioUrl = directUrl || await store.ensureListeningAudio(id);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
async function playSelectedSentence() {
    const sentence = store.selectedListening;
    if (!sentence) {
        return;
    }
    await playSentence(sentence.id, sentence.audioFile);
}
async function handleSaveNote(note) {
    error.value = '';
    try {
        await store.updateListeningNote(note);
        message.value = 'Note saved.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save note.';
    }
}
async function handleSendChat(messageInput) {
    error.value = '';
    chatLoading.value = true;
    try {
        await store.sendListeningChatMessage(messageInput);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Chat failed.';
    }
    finally {
        chatLoading.value = false;
    }
}
async function handleClearChat() {
    error.value = '';
    try {
        await store.clearListeningChatHistory();
        message.value = 'Tutor chat cleared.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to clear chat.';
    }
}
async function startLearning() {
    error.value = '';
    taskLoading.value = true;
    try {
        await store.createListeningTask();
        await router.push('/tasks');
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create listening task.';
    }
    finally {
        taskLoading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "vocabulary-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card listening-input-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleAddSentence) },
    ...{ class: "listening-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.sentenceInput),
    type: "text",
    placeholder: "Type an English sentence for listening practice",
    disabled: (__VLS_ctx.adding),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "button button-primary" },
    type: "submit",
    disabled: (__VLS_ctx.adding || !__VLS_ctx.sentenceInput.trim()),
});
(__VLS_ctx.adding ? 'Adding...' : 'Add Sentence');
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "success-text" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text" },
    });
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card listening-list-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace-grid listening-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card list-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inline-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "muted-text" },
});
(__VLS_ctx.store.listeningItems.length);
if (__VLS_ctx.store.listeningItems.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-copy" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-scroller" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.store.listeningItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.store.listeningItems.length === 0))
                        return;
                    __VLS_ctx.store.selectListening(item.id);
                } },
            key: (item.id),
            ...{ class: "word-row" },
            ...{ class: ({ active: __VLS_ctx.store.selectedListeningId === item.id }) },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-main sentence-item-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "sentence-item-text" },
        });
        (item.sentence);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted-text sentence-item-familiarity" },
        });
        (item.familiarity);
    }
}
/** @type {[typeof SentenceDetailPanel, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(SentenceDetailPanel, new SentenceDetailPanel({
    ...{ 'onPlayAudio': {} },
    ...{ 'onSaveNote': {} },
    ...{ 'onSendChat': {} },
    ...{ 'onClearChat': {} },
    sentence: (__VLS_ctx.store.selectedListening),
    loading: (__VLS_ctx.chatLoading),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onPlayAudio': {} },
    ...{ 'onSaveNote': {} },
    ...{ 'onSendChat': {} },
    ...{ 'onClearChat': {} },
    sentence: (__VLS_ctx.store.selectedListening),
    loading: (__VLS_ctx.chatLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onPlayAudio: (__VLS_ctx.playSelectedSentence)
};
const __VLS_7 = {
    onSaveNote: (__VLS_ctx.handleSaveNote)
};
const __VLS_8 = {
    onSendChat: (__VLS_ctx.handleSendChat)
};
const __VLS_9 = {
    onClearChat: (__VLS_ctx.handleClearChat)
};
var __VLS_2;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "learning-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtle-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.startLearning) },
    ...{ class: "button button-primary" },
    type: "button",
    disabled: (__VLS_ctx.taskLoading),
});
(__VLS_ctx.taskLoading ? 'Preparing...' : 'Learning');
/** @type {__VLS_StyleScopedClasses['vocabulary-page']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['listening-input-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['listening-form']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['listening-list-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['listening-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['list-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['list-scroller']} */ ;
/** @type {__VLS_StyleScopedClasses['word-row']} */ ;
/** @type {__VLS_StyleScopedClasses['task-main']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-item-text']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sentence-item-familiarity']} */ ;
/** @type {__VLS_StyleScopedClasses['learning-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            SentenceDetailPanel: SentenceDetailPanel,
            store: store,
            sentenceInput: sentenceInput,
            error: error,
            message: message,
            adding: adding,
            taskLoading: taskLoading,
            chatLoading: chatLoading,
            handleAddSentence: handleAddSentence,
            playSelectedSentence: playSelectedSentence,
            handleSaveNote: handleSaveNote,
            handleSendChat: handleSendChat,
            handleClearChat: handleClearChat,
            startLearning: startLearning,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
