import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SearchBar from '@/components/SearchBar.vue';
import SearchResultCard from '@/components/SearchResultCard.vue';
import WordDetailPanel from '@/components/WordDetailPanel.vue';
import WordList from '@/components/WordList.vue';
import { useVocabularyStore } from '@/stores/vocabulary';
import { api } from '@/services/api';
import { buildMediaUrl, clearCachedAudioUrl, clearCachedMediaUrl, getAudioUrl, getStoredMediaAudioUrl } from '@/utils/audioCache';
const store = useVocabularyStore();
const router = useRouter();
const query = ref('');
const error = ref('');
const message = ref('');
const showChinese = ref(false);
const chatLoading = ref(false);
const quizLoading = ref(false);
const audioVersions = reactive({});
const searchCommonUrl = ref(null);
const wordCommonUrl = ref(null);
async function refreshSearchCommonAudio() {
    const result = store.searchResult;
    if (!result || !result.found) {
        searchCommonUrl.value = null;
        return;
    }
    try {
        const { audioUrl } = await api.hasCommonAudio(result.text);
        searchCommonUrl.value = audioUrl;
    }
    catch {
        searchCommonUrl.value = null;
    }
}
async function refreshWordCommonAudio() {
    const word = store.selectedWord;
    if (!word) {
        wordCommonUrl.value = null;
        return;
    }
    try {
        const { audioUrl } = await api.hasCommonAudio(word.text);
        wordCommonUrl.value = audioUrl;
    }
    catch {
        wordCommonUrl.value = null;
    }
}
watch(() => store.searchResult, () => void refreshSearchCommonAudio());
watch(() => store.selectedWord?.id, () => void refreshWordCommonAudio());
onMounted(async () => {
    try {
        await store.fetchVocabulary();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load vocabulary.';
    }
});
async function fetchSuggestions(prefix) {
    try {
        const { suggestions } = await api.suggestWords(prefix);
        return suggestions;
    }
    catch {
        return [];
    }
}
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
async function handleDeleteWord(id) {
    error.value = '';
    message.value = '';
    try {
        await store.deleteWord(id);
        message.value = 'Word deleted.';
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete word.';
    }
}
async function playSearchAudio(input) {
    error.value = '';
    try {
        const audioUrl = searchCommonUrl.value ?? await getAudioUrl(input);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
async function regenerateSearchAudio(input) {
    error.value = '';
    try {
        clearCachedAudioUrl(input);
        const { audioUrl } = await api.regenerateAudio(input);
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio regeneration failed.';
    }
}
async function playWordAudio() {
    error.value = '';
    const word = store.selectedWord;
    if (!word) {
        return;
    }
    try {
        if (wordCommonUrl.value) {
            const audio = new Audio(wordCommonUrl.value);
            await audio.play();
            return;
        }
        const version = audioVersions[word.id];
        let audioUrl;
        if (version && word.audioFile) {
            audioUrl = buildMediaUrl(word.audioFile, version);
        }
        else {
            const directUrl = getStoredMediaAudioUrl(word.audioFile);
            audioUrl = directUrl || await store.ensureWordAudio(word.id);
        }
        const audio = new Audio(audioUrl);
        await audio.play();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio playback failed.';
    }
}
async function regenerateWordAudio() {
    error.value = '';
    const word = store.selectedWord;
    if (!word) {
        return;
    }
    try {
        const { audioFile } = await api.regenerateWordAudio(word.id);
        word.audioFile = audioFile;
        if (audioFile) {
            clearCachedMediaUrl(audioFile);
            const version = (audioVersions[word.id] ?? 0) + 1;
            audioVersions[word.id] = version;
            const audioUrl = buildMediaUrl(audioFile, version);
            const audio = new Audio(audioUrl);
            await audio.play();
        }
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Audio regeneration failed.';
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
    suggest: (__VLS_ctx.fetchSuggestions),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onSearch': {} },
    modelValue: (__VLS_ctx.query),
    loading: (__VLS_ctx.store.searching),
    suggest: (__VLS_ctx.fetchSuggestions),
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
    ...{ 'onRegenerateAudio': {} },
    result: (__VLS_ctx.store.searchResult),
    showChinese: (__VLS_ctx.showChinese),
    saving: (__VLS_ctx.store.savingWord),
    hasCommonAudio: (!!__VLS_ctx.searchCommonUrl),
}));
const __VLS_8 = __VLS_7({
    ...{ 'onSave': {} },
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    ...{ 'onRegenerateAudio': {} },
    result: (__VLS_ctx.store.searchResult),
    showChinese: (__VLS_ctx.showChinese),
    saving: (__VLS_ctx.store.savingWord),
    hasCommonAudio: (!!__VLS_ctx.searchCommonUrl),
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
const __VLS_16 = {
    onRegenerateAudio: (__VLS_ctx.regenerateSearchAudio)
};
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace-grid" },
});
/** @type {[typeof WordList, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(WordList, new WordList({
    ...{ 'onSelect': {} },
    items: (__VLS_ctx.store.items),
    selectedId: (__VLS_ctx.store.selectedId),
}));
const __VLS_18 = __VLS_17({
    ...{ 'onSelect': {} },
    items: (__VLS_ctx.store.items),
    selectedId: (__VLS_ctx.store.selectedId),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onSelect: (__VLS_ctx.store.selectWord)
};
var __VLS_19;
/** @type {[typeof WordDetailPanel, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(WordDetailPanel, new WordDetailPanel({
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    ...{ 'onRegenerateAudio': {} },
    ...{ 'onSaveNote': {} },
    ...{ 'onSendChat': {} },
    ...{ 'onClearChat': {} },
    ...{ 'onDelete': {} },
    word: (__VLS_ctx.store.selectedWord),
    showChinese: (__VLS_ctx.showChinese),
    loading: (__VLS_ctx.chatLoading),
    hasCommonAudio: (!!__VLS_ctx.wordCommonUrl),
}));
const __VLS_25 = __VLS_24({
    ...{ 'onToggleTranslation': {} },
    ...{ 'onPlayAudio': {} },
    ...{ 'onRegenerateAudio': {} },
    ...{ 'onSaveNote': {} },
    ...{ 'onSendChat': {} },
    ...{ 'onClearChat': {} },
    ...{ 'onDelete': {} },
    word: (__VLS_ctx.store.selectedWord),
    showChinese: (__VLS_ctx.showChinese),
    loading: (__VLS_ctx.chatLoading),
    hasCommonAudio: (!!__VLS_ctx.wordCommonUrl),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_27;
let __VLS_28;
let __VLS_29;
const __VLS_30 = {
    onToggleTranslation: (...[$event]) => {
        __VLS_ctx.showChinese = !__VLS_ctx.showChinese;
    }
};
const __VLS_31 = {
    onPlayAudio: (__VLS_ctx.playWordAudio)
};
const __VLS_32 = {
    onRegenerateAudio: (__VLS_ctx.regenerateWordAudio)
};
const __VLS_33 = {
    onSaveNote: (__VLS_ctx.handleSaveNote)
};
const __VLS_34 = {
    onSendChat: (__VLS_ctx.handleSendChat)
};
const __VLS_35 = {
    onClearChat: (__VLS_ctx.handleClearChat)
};
const __VLS_36 = {
    onDelete: (__VLS_ctx.handleDeleteWord)
};
var __VLS_26;
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
            searchCommonUrl: searchCommonUrl,
            wordCommonUrl: wordCommonUrl,
            fetchSuggestions: fetchSuggestions,
            handleSearch: handleSearch,
            handleSaveWord: handleSaveWord,
            handleSaveNote: handleSaveNote,
            handleSendChat: handleSendChat,
            handleClearChat: handleClearChat,
            handleDeleteWord: handleDeleteWord,
            playSearchAudio: playSearchAudio,
            regenerateSearchAudio: regenerateSearchAudio,
            playWordAudio: playWordAudio,
            regenerateWordAudio: regenerateWordAudio,
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
