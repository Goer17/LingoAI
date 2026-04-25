import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import SearchBar from '@/components/SearchBar.vue';
import SearchResultCard from '@/components/SearchResultCard.vue';
import WordDetailPanel from '@/components/WordDetailPanel.vue';
import WordList from '@/components/WordList.vue';
import { useVocabularyStore } from '@/stores/vocabulary';
import { getAudioUrl, getStoredMediaAudioUrl } from '@/utils/audioCache';
const store = useVocabularyStore();
const router = useRouter();
const query = ref('');
const error = ref('');
const message = ref('');
const showChinese = ref(false);
const chatLoading = ref(false);
const quizLoading = ref(false);
onMounted(async () => {
    try {
        await store.fetchVocabulary();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load vocabulary.';
    }
});
async function handleSearch() {
    error.value = '';
    message.value = '';
    try {
        await store.searchWord(query.value.trim());
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Search failed.';
    }
}
async function handleSaveWord() {
    error.value = '';
    message.value = '';
    try {
        const data = await store.saveWord();
        message.value = data.created ? 'Word added to vocabulary.' : 'This word already exists.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Save failed.';
    }
}
async function handleSaveNote(note) {
    error.value = '';
    try {
        await store.updateNote(note);
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
        await store.sendChatMessage(messageInput);
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
        await store.clearChatHistory();
        message.value = 'Tutor chat cleared.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to clear chat.';
    }
}
async function playSearchAudio(input) {
    error.value = '';
    try {
        const audioUrl = await getAudioUrl(input);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
async function playWordAudio() {
    error.value = '';
    const word = store.selectedWord;
    if (!word) {
        return;
    }
    try {
        const directUrl = getStoredMediaAudioUrl(word.audioFile);
        const audioUrl = directUrl || await store.ensureWordAudio(word.id);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
async function startLearning() {
    error.value = '';
    quizLoading.value = true;
    try {
        await store.createVocabularyTask();
        await router.push('/tasks');
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create task.';
    }
    finally {
        quizLoading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "vocabulary-page" },
});
/** @type {[typeof SearchBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(SearchBar, new SearchBar({
    ...{ 'onSearch': {} },
    modelValue: (__VLS_ctx.query),
    loading: (__VLS_ctx.store.searching),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onSearch': {} },
    modelValue: (__VLS_ctx.query),
    loading: (__VLS_ctx.store.searching),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onSearch: (__VLS_ctx.handleSearch)
};
var __VLS_2;
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
/** @type {[typeof SearchResultCard, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(SearchResultCard, new SearchResultCard({
    ...{ 'onSave': {} },
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    result: (__VLS_ctx.store.searchResult),
    showChinese: (__VLS_ctx.showChinese),
    saving: (__VLS_ctx.store.savingWord),
}));
const __VLS_8 = __VLS_7({
    ...{ 'onSave': {} },
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    result: (__VLS_ctx.store.searchResult),
    showChinese: (__VLS_ctx.showChinese),
    saving: (__VLS_ctx.store.savingWord),
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_10;
let __VLS_11;
let __VLS_12;
const __VLS_13 = {
    onSave: (__VLS_ctx.handleSaveWord)
};
const __VLS_14 = {
    onToggleTranslation: (...[$event]) => {
        __VLS_ctx.showChinese = !__VLS_ctx.showChinese;
    }
};
const __VLS_15 = {
    onPlayAudio: (__VLS_ctx.playSearchAudio)
};
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace-grid" },
});
/** @type {[typeof WordList, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(WordList, new WordList({
    ...{ 'onSelect': {} },
    items: (__VLS_ctx.store.items),
    selectedId: (__VLS_ctx.store.selectedId),
}));
const __VLS_17 = __VLS_16({
    ...{ 'onSelect': {} },
    items: (__VLS_ctx.store.items),
    selectedId: (__VLS_ctx.store.selectedId),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_19;
let __VLS_20;
let __VLS_21;
const __VLS_22 = {
    onSelect: (__VLS_ctx.store.selectWord)
};
var __VLS_18;
/** @type {[typeof WordDetailPanel, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(WordDetailPanel, new WordDetailPanel({
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    ...{ 'onSaveNote': {} },
    ...{ 'onSendChat': {} },
    ...{ 'onClearChat': {} },
    word: (__VLS_ctx.store.selectedWord),
    showChinese: (__VLS_ctx.showChinese),
    loading: (__VLS_ctx.chatLoading),
}));
const __VLS_24 = __VLS_23({
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    ...{ 'onSaveNote': {} },
    ...{ 'onSendChat': {} },
    ...{ 'onClearChat': {} },
    word: (__VLS_ctx.store.selectedWord),
    showChinese: (__VLS_ctx.showChinese),
    loading: (__VLS_ctx.chatLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_26;
let __VLS_27;
let __VLS_28;
const __VLS_29 = {
    onToggleTranslation: (...[$event]) => {
        __VLS_ctx.showChinese = !__VLS_ctx.showChinese;
    }
};
const __VLS_30 = {
    onPlayAudio: (__VLS_ctx.playWordAudio)
};
const __VLS_31 = {
    onSaveNote: (__VLS_ctx.handleSaveNote)
};
const __VLS_32 = {
    onSendChat: (__VLS_ctx.handleSendChat)
};
const __VLS_33 = {
    onClearChat: (__VLS_ctx.handleClearChat)
};
var __VLS_25;
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
    disabled: (__VLS_ctx.quizLoading),
});
(__VLS_ctx.quizLoading ? 'Preparing...' : 'Learning');
/** @type {__VLS_StyleScopedClasses['vocabulary-page']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['learning-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            SearchBar: SearchBar,
            SearchResultCard: SearchResultCard,
            WordDetailPanel: WordDetailPanel,
            WordList: WordList,
            store: store,
            query: query,
            error: error,
            message: message,
            showChinese: showChinese,
            chatLoading: chatLoading,
            quizLoading: quizLoading,
            handleSearch: handleSearch,
            handleSaveWord: handleSaveWord,
            handleSaveNote: handleSaveNote,
            handleSendChat: handleSendChat,
            handleClearChat: handleClearChat,
            playSearchAudio: playSearchAudio,
            playWordAudio: playWordAudio,
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
