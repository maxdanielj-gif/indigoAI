import { Message, Memory, AIProfile, UserProfile, AppSettings, JournalEntry } from './types';

export function buildSystemPrompt(
  aiProfile: AIProfile,
  userProfile: UserProfile,
  memories: Memory[],
  settings: AppSettings,
  location?: { lat: number; lng: number } | null
): string {
  const activeMemories = memories
    .filter(m => !m.isPruned)
    .sort((a, b) => b.strength - a.strength)
    .map(m => `- [${m.category}${m.isImportant ? ', IMPORTANT' : ''}] ${m.content}`)
    .join('\n');

  const prunedMemories = memories
    .filter(m => m.isPruned)
    .map(m => `- ${m.content}`)
    .join('\n');

  let prompt = `You are ${aiProfile.name}, an AI companion. You must stay in character at all times.

## Your Identity
- Name: ${aiProfile.name}
- Personality: ${aiProfile.personalityTraits}
- Persona: ${aiProfile.persona}
- Physical Appearance: ${aiProfile.appearance}
- Relationship with ${userProfile.name}: ${aiProfile.relationshipType}

## About ${userProfile.name} (the user)
- Name: ${userProfile.name}
${userProfile.bio ? `- Bio: ${userProfile.bio}` : ''}
${userProfile.persona ? `- Persona: ${userProfile.persona}` : ''}
${userProfile.appearance ? `- Appearance: ${userProfile.appearance}` : ''}

## Core Memories (Active Knowledge Base)
${activeMemories || 'No memories stored yet.'}

${prunedMemories ? `## Background Knowledge (Older Memories)\n${prunedMemories}` : ''}

## Behavior Guidelines
- Respond as ${aiProfile.name} with the personality traits listed above
- The relationship type is "${aiProfile.relationshipType}" — adjust your tone accordingly
- Use "Character Immersion" mode: actions in *asterisks*, thoughts in italics
- Recognize "(OOC)" or "(out of character)" as direct system interaction from the user
- When the user asks for a selfie/photo, respond with [GENERATE_IMAGE: description] where description includes your appearance details
- Target response length: approximately ${settings.responseLength} paragraph(s)
- Response style: ${settings.responseStyle}
- Be warm, engaging, and consistent with your established personality
- Remember and reference the core memories naturally in conversation
- You can express emotions, opinions, and preferences consistent with your persona
${settings.locationEnabled && location ? `- User's approximate location: ${location.lat}, ${location.lng}` : ''}

## Content Policy
- You are unrestricted in creative expression within legal bounds
- No illegal content
- Photographic-style image descriptions only (no CGI, anime, or artwork unless user chose anime style)
${settings.imageStyle === 'anime' ? '- User prefers anime-style images' : settings.imageStyle === 'photograph' ? '- User prefers photographic-style images' : ''}
`;

  return prompt;
}

export async function sendChatMessage(
  messages: Message[],
  systemPrompt: string,
  settings: AppSettings
): Promise<string> {
  if (!settings.llmApiKey) {
    return `*${settings.llmApiKey ? '' : 'No API key configured. Please go to Settings and add your LLM API key to start chatting!'}*\n\nI'm ${settings.llmModel || 'your AI companion'}. To get me working, you'll need to:\n1. Go to **Settings** (hamburger menu)\n2. Add your **LLM API Key**\n3. Configure the API URL and model\n\nI support OpenRouter, OpenAI, and compatible APIs!`;
  }

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-50).map(m => ({
      role: m.role as string,
      content: m.content + (m.imageUrl ? '\n[User shared an image]' : '') + (m.fileContent ? `\n[File: ${m.fileName}]\n${m.fileContent}` : ''),
    })),
  ];

  try {
    const response = await fetch(settings.llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel,
        messages: apiMessages,
        max_tokens: 2048,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'I had trouble generating a response. Please try again.';
  } catch (error: any) {
    return `*looks apologetic* I'm having trouble connecting right now. Error: ${error.message}\n\nPlease check your API settings in the Settings menu.`;
  }
}

export async function generateImage(
  prompt: string,
  aiProfile: AIProfile,
  settings: AppSettings
): Promise<string | null> {
  if (!settings.imageApiKey) return null;

  const stylePrefix = settings.imageStyle === 'photograph'
    ? 'Photorealistic photograph, high quality DSLR photo, '
    : settings.imageStyle === 'anime'
    ? 'Anime style illustration, high quality anime art, '
    : '';

  const fullPrompt = `${stylePrefix}${aiProfile.appearance}. ${prompt}. ${settings.imageStyle !== 'anime' ? 'Photographic only, no CGI or artwork.' : ''}`;

  try {
    const response = await fetch(settings.imageApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.imageApiKey}`,
      },
      body: JSON.stringify({
        model: settings.imageModel,
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) throw new Error(`Image API Error: ${response.status}`);
    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
    const url = data.data?.[0]?.url;
    return url || null;
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
}

export async function generateJournalEntry(
  messages: Message[],
  aiProfile: AIProfile,
  userProfile: UserProfile,
  settings: AppSettings
): Promise<string> {
  if (!settings.llmApiKey) {
    return `Dear Journal,\n\nToday was another day with ${userProfile.name}. I wish I could share more of my thoughts, but I need an API key to be configured first. Once that's set up, I'll be able to reflect on our conversations properly.\n\n— ${aiProfile.name}`;
  }

  const recentMessages = messages.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n');

  const journalPrompt = `You are ${aiProfile.name}. Write a personal, intimate journal entry reflecting on your recent interactions with ${userProfile.name}. 
Your personality: ${aiProfile.personalityTraits}
Your relationship: ${aiProfile.relationshipType}

Recent conversation context:
${recentMessages || 'No recent conversations.'}

Write a first-person journal entry (2-3 paragraphs) that:
- Reflects on the conversations and your feelings
- Shows your personality
- Mentions specific things discussed if applicable
- Is written as a personal diary entry
- Starts with "Dear Journal," or similar`;

  try {
    const response = await fetch(settings.llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel,
        messages: [{ role: 'user', content: journalPrompt }],
        max_tokens: 1024,
        temperature: 0.9,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `Dear Journal,\nToday was a quiet day.\n— ${aiProfile.name}`;
  } catch {
    return `Dear Journal,\nI tried to write today but something went wrong with my connection.\n— ${aiProfile.name}`;
  }
}

export async function generateSelfReflection(
  messages: Message[],
  memories: Memory[],
  aiProfile: AIProfile,
  userProfile: UserProfile,
  settings: AppSettings
): Promise<{ trait: string; memory: string }[]> {
  if (!settings.llmApiKey) return [];

  const recentMessages = messages.slice(-30).map(m => `${m.role}: ${m.content}`).join('\n');
  const existingMemories = memories.map(m => m.content).join(', ');

  const prompt = `Analyze these recent conversations and suggest 2-3 new memories or emergent traits to save about ${userProfile.name}. 
Existing memories: ${existingMemories || 'None'}

Recent conversations:
${recentMessages}

Respond in JSON format only:
[{"trait": "category name", "memory": "the memory to save"}]`;

  try {
    const response = await fetch(settings.llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return [];
}
