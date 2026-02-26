import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export const sendMessage = async (history: Message[], message: string, systemInstruction?: string) => {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemInstruction || "You are a helpful AI companion.",
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};

export const generateImageDescription = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed description for an image based on this prompt: ${prompt}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating image description:", error);
    throw error;
  }
};
