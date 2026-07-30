<template>
  <section class="vocabulary-page">
    <div class="card listening-input-card">
      <div class="section-heading">
        <p class="eyebrow">Listening</p>
        <h2>Add Practice Sentences</h2>
        <p class="subtle-copy">Each sentence starts at familiarity 0 and grows to 20.</p>
      </div>

      <div class="group-bar">
        <div class="group-selector">
          <label class="field" style="margin-bottom: 0;">
            <span>Group</span>
            <select v-model="activeGroupId" @change="onGroupChange">
              <option v-for="g in store.listeningGroups" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </label>
        </div>
        <form class="new-group-form" @submit.prevent="handleCreateGroup">
          <input
            v-model="newGroupName"
            type="text"
            placeholder="New group name"
            :disabled="creatingGroup"
          />
          <button
            class="button button-secondary"
            type="submit"
            :disabled="creatingGroup || !newGroupName.trim()"
          >
            {{ creatingGroup ? 'Creating...' : 'Create Group' }}
          </button>
        </form>
        <button
          v-if="activeGroup && activeGroup.name !== 'Default'"
          class="button button-secondary delete-group-btn"
          type="button"
          :class="{ confirm: deleteGroupConfirm }"
          @click="handleDeleteGroupClick"
        >
          {{ deleteGroupConfirm ? 'Confirm Delete' : 'Delete Group' }}
        </button>
      </div>

      <form class="listening-form" @submit.prevent="handleAddSentence">
        <input
          v-model="sentenceInput"
          type="text"
          placeholder="Type an English sentence for listening practice"
          :disabled="adding"
        />
        <button class="button button-primary" type="submit" :disabled="adding || !sentenceInput.trim()">
          {{ adding ? 'Adding...' : 'Add Sentence' }}
        </button>
      </form>
    </div>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <section class="card listening-list-card">
      <div class="workspace-grid listening-grid">
        <div class="card list-card">
          <div class="inline-heading">
            <h3>Sentence Bank</h3>
            <span class="muted-text">{{ store.listeningItems.length }} items</span>
          </div>

          <p v-if="store.listeningItems.length === 0" class="empty-copy">No listening sentences yet{{ activeGroup ? ' in this group' : '' }}.</p>

          <div v-else class="list-scroller">
            <button
              v-for="item in store.listeningItems"
              :key="item.id"
              class="word-row"
              :class="{ active: store.selectedListeningId === item.id }"
              type="button"
              @click="store.selectListening(item.id)"
            >
              <div class="task-main sentence-item-main">
                <p class="sentence-item-text">{{ item.sentence }}</p>
                <p class="muted-text sentence-item-familiarity">Familiarity: {{ item.familiarity }}</p>
              </div>
            </button>
          </div>
        </div>
        <SentenceDetailPanel
          :sentence="store.selectedListening"
          :loading="chatLoading"
          @play-audio="playSelectedSentence"
          @regenerate-audio="regenerateListeningAudio"
          @save-note="handleSaveNote"
          @send-chat="handleSendChat"
          @clear-chat="handleClearChat"
          @delete="handleDeleteSentence"
        />
      </div>
    </section>

    <div class="learning-bar">
      <div>
        <p class="eyebrow">Practice</p>
        <h2>Generate a Listening Session</h2>
        <p class="subtle-copy">Blank ratio increases with familiarity. At 20, you fill the whole sentence.</p>
      </div>
      <div class="learning-bar-actions">
        <button
          class="button button-primary"
          type="button"
          :disabled="taskLoading"
          @click="startLearning"
        >
          {{ taskLoading ? 'Preparing...' : 'Learning (All)' }}
        </button>
        <button
          v-if="store.listeningItems.length > 0"
          class="button button-secondary"
          type="button"
          :disabled="taskLoading"
          @click="startLearningInGroup"
        >
          {{ taskLoading ? 'Preparing...' : `Learning (${activeGroup?.name ?? 'Group'})` }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import SentenceDetailPanel from '@/components/SentenceDetailPanel.vue';
import { useVocabularyStore } from '@/stores/vocabulary';
import { api } from '@/services/api';
import { buildMediaUrl, clearCachedMediaUrl, getStoredMediaAudioUrl } from '@/utils/audioCache';

const store = useVocabularyStore();
const router = useRouter();
const sentenceInput = ref('');
const error = ref('');
const message = ref('');
const adding = ref(false);
const taskLoading = ref(false);
const chatLoading = ref(false);
const creatingGroup = ref(false);
const deleteGroupConfirm = ref(false);
const newGroupName = ref('');
const audioVersions = reactive<Record<string, number>>({});

const activeGroupId = computed({
  get: () => store.selectedListeningGroupId,
  set: (val: string) => { store.selectListeningGroup(val); },
});

const activeGroup = computed(() => (
  store.listeningGroups.find((g) => g.id === store.selectedListeningGroupId) ?? null
));

onMounted(async () => {
  try {
    await store.fetchListeningGroups();
    await store.fetchListening();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load listening sentences.';
  }
});

function onGroupChange() {
  store.selectListening(store.listeningItems[0]?.id ?? '');
}

async function handleCreateGroup() {
  const name = newGroupName.value.trim();
  if (!name) {
    return;
  }

  error.value = '';
  message.value = '';
  creatingGroup.value = true;
  try {
    const data = await store.createListeningGroup(name);
    message.value = data.created ? `Group "${data.group.name}" created.` : `Group "${data.group.name}" already exists.`;
    newGroupName.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create group.';
  } finally {
    creatingGroup.value = false;
  }
}

async function handleDeleteGroupClick() {
  if (deleteGroupConfirm.value) {
    error.value = '';
    try {
      await store.deleteListeningGroup(store.selectedListeningGroupId);
      message.value = 'Group deleted. Sentences moved to Default.';
      deleteGroupConfirm.value = false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete group.';
    }
    return;
  }

  deleteGroupConfirm.value = true;
}

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
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add sentence.';
  } finally {
    adding.value = false;
  }
}

async function playSentence(id: string, audioFile?: string) {
  error.value = '';
  try {
    const version = audioVersions[id];
    let audioUrl: string;
    if (version && audioFile) {
      audioUrl = buildMediaUrl(audioFile, version);
    } else {
      const directUrl = getStoredMediaAudioUrl(audioFile);
      audioUrl = directUrl || await store.ensureListeningAudio(id);
    }
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
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

async function regenerateListeningAudio() {
  error.value = '';
  const sentence = store.selectedListening;
  if (!sentence) {
    return;
  }

  try {
    const { audioFile } = await api.regenerateListeningAudio(sentence.id);
    sentence.audioFile = audioFile;
    if (audioFile) {
      clearCachedMediaUrl(audioFile);
      const version = (audioVersions[sentence.id] ?? 0) + 1;
      audioVersions[sentence.id] = version;
      const audioUrl = buildMediaUrl(audioFile, version);
      const audio = new Audio(audioUrl);
      await audio.play();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Audio regeneration failed.';
  }
}

async function handleSaveNote(note: string) {
  error.value = '';
  try {
    await store.updateListeningNote(note);
    message.value = 'Note saved.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save note.';
  }
}

async function handleSendChat(messageInput: string) {
  error.value = '';
  chatLoading.value = true;
  try {
    await store.sendListeningChatMessage(messageInput);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Chat failed.';
  } finally {
    chatLoading.value = false;
  }
}

async function handleClearChat() {
  error.value = '';
  try {
    await store.clearListeningChatHistory();
    message.value = 'Tutor chat cleared.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to clear chat.';
  }
}

async function handleDeleteSentence(id: string) {
  error.value = '';
  message.value = '';
  try {
    await store.deleteListeningSentence(id);
    message.value = 'Sentence deleted.';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete sentence.';
  }
}

async function startLearning() {
  error.value = '';
  taskLoading.value = true;
  try {
    await store.createListeningTask();
    await router.push('/tasks');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create listening task.';
  } finally {
    taskLoading.value = false;
  }
}

async function startLearningInGroup() {
  error.value = '';
  taskLoading.value = true;
  try {
    await store.createListeningTaskForGroup(store.selectedListeningGroupId);
    await router.push('/tasks');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create listening task for group.';
  } finally {
    taskLoading.value = false;
  }
}
</script>

<style scoped>
.group-bar {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.group-selector {
  flex: 0 0 auto;
  width: 200px;
}

.new-group-form {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  flex: 1;
  min-width: 250px;
}

.new-group-form input {
  flex: 1;
}

.delete-group-btn.confirm {
  background: var(--color-error, #dc2626);
  color: #fff;
  border-color: var(--color-error, #dc2626);
}

.learning-bar-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
