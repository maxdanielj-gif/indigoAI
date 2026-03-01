
export interface VoiceCloneParams {
  text: string;
  referenceAudioUrl: string;
  token: string;
}

export interface ImageGenParams {
  prompt: string;
  token: string;
  model?: string;
}

export interface VideoGenParams {
  prompt: string;
  token: string;
  model?: string;
}

export const cloneVoice = async ({ text, referenceAudioUrl, token }: VoiceCloneParams): Promise<Blob> => {
  const url = "https://api-inference.huggingface.co/models/SWivid/F5-TTS";
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  const payload = {
    inputs: {
      text,
      audio: referenceAudioUrl,
      language: "en"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF Voice Clone Error ${response.status}: ${errText}`);
  }

  return await response.blob();
};

export const generateImage = async ({ prompt, token, model = "black-forest-labs/FLUX.1-dev" }: ImageGenParams): Promise<Blob> => {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  const payload = { inputs: prompt };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF Image Gen Error ${response.status}: ${errText}`);
  }

  return await response.blob();
};

export const generateVideo = async ({ prompt, token, model = "THUDM/CogVideoX-2b" }: VideoGenParams): Promise<Blob> => {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  const payload = { inputs: prompt };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF Video Gen Error ${response.status}: ${errText}`);
  }

  return await response.blob();
};
