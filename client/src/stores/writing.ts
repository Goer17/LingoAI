import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import type { WritingTopic, WritingTopicKind } from '@/types/models';

/**
 * Expression notes: one Markdown note per title, split into Grammar and Topics.
 * Kept separate from the vocabulary store so the two features never share state.
 */
export const useWritingStore = defineStore('writing', () => {
  const topics = ref<WritingTopic[]>([]);
  const loading = ref(false);
  const kind = ref<WritingTopicKind>('topic');
  const selectedId = ref('');

  const items = computed(() => topics.value.filter((topic) => (topic.kind ?? 'topic') === kind.value));
  const selected = computed(() => items.value.find((topic) => topic.id === selectedId.value) ?? null);

  function replace(topic: WritingTopic) {
    topics.value = topics.value.map((item) => (item.id === topic.id ? topic : item));
  }

  function select(id: string) {
    selectedId.value = id;
  }

  function setKind(next: WritingTopicKind) {
    kind.value = next;
    if (!items.value.some((topic) => topic.id === selectedId.value)) {
      selectedId.value = items.value[0]?.id ?? '';
    }
  }

  async function fetchTopics() {
    loading.value = true;
    try {
      topics.value = await api.getWritingTopics();
      if (!items.value.some((topic) => topic.id === selectedId.value)) {
        selectedId.value = items.value[0]?.id ?? '';
      }
    } finally {
      loading.value = false;
    }
  }

  async function addTitle(title: string) {
    const result = await api.addWritingTopic(title, kind.value);
    if (result.created) {
      topics.value = [result.topic, ...topics.value];
    } else {
      replace(result.topic);
      // The title already existed under the other tab; follow it there.
      kind.value = result.topic.kind ?? 'topic';
    }

    selectedId.value = result.topic.id;
    return result;
  }

  async function rename(id: string, title: string) {
    const topic = await api.updateWritingTopicTitle(id, title);
    replace(topic);
    return topic;
  }

  async function saveNote(id: string, note: string) {
    const topic = await api.saveWritingTopicNote(id, note);
    replace(topic);
    return topic;
  }

  async function remove(id: string) {
    await api.deleteWritingTopic(id);
    topics.value = topics.value.filter((topic) => topic.id !== id);
    if (selectedId.value === id) {
      selectedId.value = items.value[0]?.id ?? '';
    }
  }

  return {
    topics,
    loading,
    kind,
    selectedId,
    items,
    selected,
    fetchTopics,
    addTitle,
    rename,
    saveNote,
    remove,
    select,
    setKind,
  };
});