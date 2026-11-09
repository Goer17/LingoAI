/**
 * Quiz feedback cues.
 *
 * The tones are synthesised with the Web Audio API instead of shipping audio
 * files: nothing to download, no decode delay, and the cue cannot fail because
 * a media request 404s. Everything is wrapped so a blocked AudioContext can
 * never break answering.
 */
type Cue = 'correct' | 'incorrect';
/**
 * Call once from a real user gesture (click / keydown). Browsers keep a fresh
 * AudioContext suspended until the page has been interacted with, and the quiz
 * plays its cue from an async submit handler — i.e. after that gesture.
 */
export declare function unlockFeedbackSound(): void;
export declare function playFeedbackSound(cue: Cue): void;
export {};
