import { getSettings } from './settingsService.js';
import { generateAudioBase64 } from './openaiService.js';

const AUDIO_CACHE_LIMIT = 2 ** 10;

class LruAudioCache {
  private readonly store = new Map<string, string>();

  get(key: string) {
    const value = this.store.get(key);
    if (!value) {
      return null;
    }

    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key: string, value: string) {
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

const audioDataUrlCache = new LruAudioCache();

function getCacheKey(input: string) {
  const settings = getSettings();
  return [
    settings.baseUrl,
    settings.audioModel,
    input.trim(),
  ].join('::');
}

export async function createAudioDataUrl(input: string) {
  const key = getCacheKey(input);
  const cached = audioDataUrlCache.get(key);
  if (cached) {
    return cached;
  }

  const base64 = await generateAudioBase64(input);
  const audioUrl = `data:audio/mp3;base64,${base64}`;
  audioDataUrlCache.set(key, audioUrl);
  return audioUrl;
}
