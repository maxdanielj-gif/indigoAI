import { TTSSettings, AppSettings } from './types';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() || [];
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  return getAvailableVoices().filter(v => v.lang.startsWith('en'));
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[.*?\]/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();
}

export function speakBrowser(text: string, settings: TTSSettings): void {
  if (!window.speechSynthesis) return;

  const cleanText = cleanTextForTTS(text);
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
    const langVoices = voices.filter(v => v.lang.startsWith(settings.language));
    if (langVoices.length > 0) {
      utterance.voice = langVoices[0];
    }
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export async function speakHuggingFace(text: string, settings: TTSSettings, hfApiKey: string): Promise<void> {
  if (!hfApiKey) {
    console.warn('Hugging Face API token missing. Falling back to browser TTS.');
    speakBrowser(text, settings);
    return;
  }

  const cleanText = cleanTextForTTS(text);
  if (!cleanText) return;

  stop();

  const hfUrl = 'https://api-inference.huggingface.co/models/SWivid/F5-TTS';
  const payload = {
    inputs: {
      text: cleanText,
      audio: settings.hfReferenceAudioUrl || 'https://raw.githubusercontent.com/maxdanielj-gif/voice-clone/main/Kelly_2.wav',
      language: 'en',
    },
  };

  try {
    let response: Response;
    try {
      response = await fetch(hfUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (directErr) {
      console.warn('Direct HF fetch failed (likely CORS), attempting via proxy...', directErr);
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(hfUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      if (response.status === 503) {
        console.warn('HF Model loading... falling back to browser TTS temporarily.');
        speakBrowser(text, settings);
        return;
      }
      throw new Error(`HF API Error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.playbackRate = settings.rate;
    audio.volume = settings.volume;
    currentAudio = audio;
    audio.play();
  } catch (err) {
    console.error('Hugging Face TTS Error:', err);
    speakBrowser(text, settings);
  }
}

export function speak(text: string, settings: TTSSettings, appSettings?: AppSettings): void {
  if (!settings.enabled) return;

  if (settings.engine === 'huggingface' && appSettings?.hfApiKey) {
    speakHuggingFace(text, settings, appSettings.hfApiKey);
    return;
  }

  speakBrowser(text, settings);
}

export function stop(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function isSpeaking(): boolean {
  return (window.speechSynthesis?.speaking || false) || (currentAudio !== null && !currentAudio.paused);
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
