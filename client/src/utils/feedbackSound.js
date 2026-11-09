/**
 * Quiz feedback cues.
 *
 * The tones are synthesised with the Web Audio API instead of shipping audio
 * files: nothing to download, no decode delay, and the cue cannot fail because
 * a media request 404s. Everything is wrapped so a blocked AudioContext can
 * never break answering.
 */
let audioContext = null;
function getContext() {
    if (typeof window === 'undefined') {
        return null;
    }
    const Ctor = window.AudioContext
        ?? window.webkitAudioContext;
    if (!Ctor) {
        return null;
    }
    if (!audioContext) {
        try {
            audioContext = new Ctor();
        }
        catch {
            return null;
        }
    }
    return audioContext;
}
function playTone(context, options) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const { frequency, frequencyEnd, startAt, duration, type, volume } = options;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (frequencyEnd) {
        oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, startAt + duration);
    }
    // Short attack and exponential release keep the cue dry and unobtrusive.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
}
/**
 * Call once from a real user gesture (click / keydown). Browsers keep a fresh
 * AudioContext suspended until the page has been interacted with, and the quiz
 * plays its cue from an async submit handler — i.e. after that gesture.
 */
export function unlockFeedbackSound() {
    const context = getContext();
    if (context && context.state === 'suspended') {
        void context.resume().catch(() => undefined);
    }
}
export function playFeedbackSound(cue) {
    const context = getContext();
    if (!context) {
        return;
    }
    if (context.state === 'suspended') {
        void context.resume().catch(() => undefined);
    }
    const now = context.currentTime + 0.01;
    try {
        if (cue === 'correct') {
            // Rising major third: a clear "ding" that does not sound like UI chrome.
            playTone(context, { frequency: 784, startAt: now, duration: 0.11, type: 'triangle', volume: 0.07 });
            playTone(context, { frequency: 1175, startAt: now + 0.1, duration: 0.19, type: 'triangle', volume: 0.06 });
        }
        else {
            // Short descending buzz — wrong, but not harsh.
            playTone(context, {
                frequency: 220,
                frequencyEnd: 155,
                startAt: now,
                duration: 0.26,
                type: 'sawtooth',
                volume: 0.05,
            });
        }
    }
    catch {
        // Audio feedback is optional; never let it interfere with the quiz.
    }
}
