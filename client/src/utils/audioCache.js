import { api } from '@/services/api';
const AUDIO_CACHE_LIMIT = 2 ** 10;
class LruAudioCache {
    store = new Map();
    get(key) {
        const value = this.store.get(key);
        if (!value) {
            return null;
        }
        this.store.delete(key);
        this.store.set(key, value);
        return value;
    }
    set(key, value) {
        if (this.store.has(key)) {
            this.store.delete(key);
        }
        this.store.set(key, value);
        if (this.store.size <= AUDIO_CACHE_LIMIT) {
            return;
        }
        const oldestKey = this.store.keys().next().value;
        if (oldestKey) {
            this.store.delete(oldestKey);
        }
    }
}
const audioUrlCache = new LruAudioCache();
const mediaUrlCache = new LruAudioCache();
export async function getAudioUrl(input) {
    const normalizedInput = input.trim();
    const cached = audioUrlCache.get(normalizedInput);
    if (cached) {
        return cached;
    }
    const { audioUrl } = await api.generateAudio(normalizedInput);
    audioUrlCache.set(normalizedInput, audioUrl);
    return audioUrl;
}
export function getStoredMediaAudioUrl(audioFile) {
    if (!audioFile) {
        return '';
    }
    const cached = mediaUrlCache.get(audioFile);
    if (cached) {
        return cached;
    }
    const mediaUrl = `/api/media/${encodeURIComponent(audioFile)}`;
    mediaUrlCache.set(audioFile, mediaUrl);
    return mediaUrl;
}
