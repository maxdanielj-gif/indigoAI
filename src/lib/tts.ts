import { TTSSettings } from './types';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() || [];
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  return getAvailableVoices().filter(v => v.lang.startsWith('en'));
}

export function speak(text: string, settings: TTSSettings): void {
  if (!settings.enabled || !window.speechSynthesis) return;

  // Strip markdown and action markers
  const cleanText = text
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[.*?\]/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();

  if (!cleanText) return;

  stop();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;

  const voices = getAvailableVoices();
  if (settings.voice) {
    const selectedVoice = voices.find(v => v.name === settings.voice);
    if (selectedVoice) utterance.voice = selectedVoice;
  } else {
    // Try to find a voice matching gender preference
    const langVoices = voices.filter(v => v.lang.startsWith(settings.language));
    if (langVoices.length > 0) {
      utterance.voice = langVoices[0];
    }
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stop(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return window.speechSynthesis?.speaking || false;
}

// Speech-to-Text
let recognition: any = null;

export function startListening(
  onResult: (text: string) => void,
  onEnd: () => void,
  onError: (error: string) => void
): void {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('Speech recognition not supported in this browser');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
    onEnd();
  };

  recognition.start();
}

export function stopListening(): void {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}
