import fs from 'node:fs';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { env } from '../config/env.js';

/**
 * Compound (multi-word) audio via a splicing algorithm:
 *
 *   "turn over"  →  common/turn.mp3  +  common/over.mp3  (decoded, merged, WAV)
 *
 * Priority chain used by callers:  common audio (exact word) → spliced compound
 * audio → TTS. This service handles the middle link: when a phrase has no
 * dedicated recording, it stitches together the individual word clips.
 *
 * Output: server/data/audio/compounds/{token1-token2-...}.wav, served by the
 * existing `/api/media` static route.
 */

const compoundsDir = path.join(env.audioDirectory, 'compounds');
const commonDir = path.join(env.audioDirectory, 'common');

const TARGET_RATE = 48000;
const GAP_SAMPLES = Math.round(0.09 * TARGET_RATE); // 90ms natural pause between words
const MAX_TOKENS = 6; // beyond this TTS is a better fit (sentences, not compounds)
const MIN_FILE_SIZE = 1000;

// Silence trimming: a 10ms window whose RMS stays below this is treated as
// silence and cut from the clip edges (Youdao clips ship with heavy padding).
const TRIM_WINDOW_SAMPLES = Math.round(TARGET_RATE * 0.01);
const TRIM_RMS_THRESHOLD = 0.005;

interface Clip {
  left: Float32Array;
  right: Float32Array;
}

let decoderInstance: MPEGDecoder | null = null;

async function getDecoder(): Promise<MPEGDecoder> {
  if (!decoderInstance) {
    decoderInstance = new MPEGDecoder();
    await decoderInstance.ready;
  }
  return decoderInstance;
}

/** Split a phrase into lowercase word tokens. Hyphens act as separators;
 *  in-word apostrophes are kept ("don't", "it's"). */
export function tokenizePhrase(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z']+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function commonClipPath(token: string): string | null {
  if (!token) {
    return null;
  }
  const file = path.join(commonDir, `${token}.mp3`);
  try {
    return fs.statSync(file).size > MIN_FILE_SIZE ? file : null;
  } catch {
    return null;
  }
}

function compoundFilePath(slug: string): string {
  return path.join(compoundsDir, `${slug}.wav`);
}

export function compoundAudioExists(input: string): boolean {
  const tokens = tokenizePhrase(input);
  if (tokens.length < 2 || tokens.length > MAX_TOKENS) {
    return false;
  }
  const file = compoundFilePath(tokens.join('-'));
  try {
    return fs.statSync(file).size > MIN_FILE_SIZE;
  } catch {
    return false;
  }
}

export function getCompoundAudioUrl(input: string): string {
  const slug = tokenizePhrase(input).join('-');
  return `/api/media/compounds/${encodeURIComponent(slug)}.wav`;
}

function resampleChannel(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) {
    return input.slice();
  }
  const ratio = fromRate / TARGET_RATE;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const frac = srcPos - i0;
    const i1 = Math.min(i0 + 1, input.length - 1);
    output[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return output;
}

function trimSilence(clip: Clip): Clip {
  const total = clip.left.length;
  if (total === 0) {
    return clip;
  }

  const windowRms = (start: number): number => {
    const end = Math.min(start + TRIM_WINDOW_SAMPLES, total);
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      const l = clip.left[i] ?? 0;
      const r = clip.right[i] ?? 0;
      sum += l * l + r * r;
      count += 2;
    }
    return count === 0 ? 0 : Math.sqrt(sum / count);
  };

  let start = 0;
  while (start + TRIM_WINDOW_SAMPLES <= total && windowRms(start) < TRIM_RMS_THRESHOLD) {
    start += TRIM_WINDOW_SAMPLES;
  }

  let end = total;
  while (end - TRIM_WINDOW_SAMPLES >= start && windowRms(end - TRIM_WINDOW_SAMPLES) < TRIM_RMS_THRESHOLD) {
    end -= TRIM_WINDOW_SAMPLES;
  }

  if (end - start < TARGET_RATE * 0.05) {
    // Clip is (nearly) all silence; keep it as-is rather than gutting it.
    return clip;
  }

  return {
    left: clip.left.slice(start, end),
    right: clip.right.slice(start, end),
  };
}

async function decodeClip(file: string): Promise<Clip | null> {
  try {
    const decoder = await getDecoder();
    const buf = fs.readFileSync(file);
    const decoded = decoder.decode(buf);
    if (!decoded || !decoded.channelData?.length || decoded.samplesDecoded <= 0) {
      return null;
    }
    const left = resampleChannel(decoded.channelData[0], decoded.sampleRate);
    const right = decoded.channelData[1]
      ? resampleChannel(decoded.channelData[1], decoded.sampleRate)
      : left.slice();
    return { left, right };
  } catch {
    return null;
  }
}

function encodeWav(clip: Clip): Buffer | null {
  try {
    const numSamples = clip.left.length;
    if (numSamples <= 0) {
      return null;
    }
    const bytesPerSample = 2;
    const blockAlign = 2 * bytesPerSample;
    const dataSize = numSamples * blockAlign;
    const buf = Buffer.alloc(44 + dataSize);

    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20); // PCM
    buf.writeUInt16LE(2, 22); // stereo
    buf.writeUInt32LE(TARGET_RATE, 24);
    buf.writeUInt32LE(TARGET_RATE * blockAlign, 28);
    buf.writeUInt16LE(blockAlign, 32);
    buf.writeUInt16LE(16, 34); // bits per sample
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const l = Math.max(-1, Math.min(1, clip.left[i])) * 0x7fff;
      const r = Math.max(-1, Math.min(1, clip.right[i])) * 0x7fff;
      buf.writeInt16LE(l, offset);
      buf.writeInt16LE(r, offset + 2);
      offset += 4;
    }
    return buf;
  } catch {
    return null;
  }
}

/**
 * Build (or return the cached) spliced audio for a multi-word phrase.
 * Returns the media URL on success, or null when splicing is not possible
 * (missing clips, single token, too many tokens) — callers fall back to TTS.
 */
export async function buildCompoundAudio(input: string): Promise<string | null> {
  const tokens = tokenizePhrase(input);
  if (tokens.length < 2 || tokens.length > MAX_TOKENS) {
    return null;
  }

  const slug = tokens.join('-');
  const filePath = compoundFilePath(slug);
  if (fs.existsSync(filePath)) {
    try {
      if (fs.statSync(filePath).size > MIN_FILE_SIZE) {
        return getCompoundAudioUrl(slug);
      }
    } catch {
      // fall through and rebuild
    }
  }

  const clips: Clip[] = [];
  for (const token of tokens) {
    const clipPath = commonClipPath(token);
    if (!clipPath) {
      return null;
    }
    const clip = await decodeClip(clipPath);
    if (!clip) {
      return null;
    }
    clips.push(trimSilence(clip));
  }

  // Mild peak normalization: gain-match all tokens to the loudest clip.
  let peak = 0;
  for (const clip of clips) {
    for (const sample of clip.left) {
      peak = Math.max(peak, Math.abs(sample));
    }
    for (const sample of clip.right) {
      peak = Math.max(peak, Math.abs(sample));
    }
  }
  const gain = peak > 0.9 ? 0.89 / peak : 1;
  for (const clip of clips) {
    for (let i = 0; i < clip.left.length; i++) {
      clip.left[i] *= gain;
      clip.right[i] *= gain;
    }
  }

  // Concatenate with a short silence gap between tokens.
  const totalSamples = clips.reduce((sum, clip) => sum + clip.left.length, 0)
    + GAP_SAMPLES * (clips.length - 1);
  const merged: Clip = { left: new Float32Array(totalSamples), right: new Float32Array(totalSamples) };
  let offset = 0;
  clips.forEach((clip, index) => {
    if (index > 0) {
      offset += GAP_SAMPLES;
    }
    merged.left.set(clip.left, offset);
    merged.right.set(clip.right, offset);
    offset += clip.left.length;
  });

  const wav = encodeWav(merged);
  if (!wav || wav.length < MIN_FILE_SIZE) {
    return null;
  }

  fs.mkdirSync(compoundsDir, { recursive: true });
  fs.writeFileSync(filePath, wav);
  return getCompoundAudioUrl(slug);
}