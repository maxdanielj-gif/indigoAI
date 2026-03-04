import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

// Global Error Handlers to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  // We might want to exit if the error is critical, but for dev containers, 
  // keeping it alive might be better for debugging.
  // process.exit(1);
});

console.log(`Server starting in ${process.env.NODE_ENV || 'development'} mode`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { FunctionDeclaration, Type } from "@google/genai";

// Initialize Firebase Admin
let firebaseServiceAccount = null;

try {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    firebaseServiceAccount = JSON.parse(rawKey);
  }
} catch (e: any) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.");
}

if (firebaseServiceAccount && admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseServiceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e.message);
  }
}

const generateImageFunction: FunctionDeclaration = {
  name: "generateImage",
  description: "Generates an image based on a detailed text prompt. The image will be displayed to the user in the chat and saved to their gallery.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A detailed, descriptive prompt for the image to be generated. Be specific about style, subject, and any desired elements.",
      },
    },
    required: ["prompt"],
  },
};

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());



const getOAuth2Client = (clientId?: string | null, clientSecret?: string | null) => {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return new google.auth.OAuth2(
    clientId || process.env.GOOGLE_CLIENT_ID,
    clientSecret || process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/auth/google/callback`
  );
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/google/url", (req, res) => {
  const { clientId, clientSecret } = req.query;
  const oauth2Client = getOAuth2Client(clientId as string, clientSecret as string);
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.file'
  ];

  const state = clientId && clientSecret ? btoa(JSON.stringify({ clientId, clientSecret })) : undefined;

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state
  });

  res.json({ url });
});

app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code, state } = req.query;
  
  // Try to parse state to get custom client config
  let customClientId = null;
  let customClientSecret = null;
  if (state) {
    try {
      const parsedState = JSON.parse(atob(state as string));
      customClientId = parsedState.clientId;
      customClientSecret = parsedState.clientSecret;
    } catch (e) {}
  }

  const oauth2Client = getOAuth2Client(customClientId, customClientSecret);
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/drive/files", async (req, res) => {
  const { clientId, clientSecret } = req.query;
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client(clientId as string, clientSecret as string);
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.list({
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
      q: "trashed = false and (mimeType = 'application/pdf' or mimeType = 'text/plain' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/markdown' or mimeType = 'application/json')"
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching drive files", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

app.get("/api/drive/file/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const { clientId, clientSecret } = req.query;
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client(clientId as string, clientSecret as string);
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const fileMetadata = await drive.files.get({ fileId, fields: 'name, mimeType' });
    const mimeType = fileMetadata.data.mimeType;

    let content = "";
    if (mimeType === 'application/vnd.google-apps.document') {
      const exportResponse = await drive.files.export({
        fileId,
        mimeType: 'text/plain'
      });
      content = exportResponse.data as string;
    } else {
      const getResponse = await drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'text' });
      content = getResponse.data as string;
    }

    res.json({ name: fileMetadata.data.name, content });
  } catch (error) {
    console.error("Error fetching file content", error);
    res.status(500).json({ error: "Failed to fetch file content" });
  }
});

app.post("/api/auth/google/logout", (req, res) => {
  res.clearCookie('google_tokens', {
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

app.get("/api/auth/google/status", (req, res) => {
  res.json({ isAuthenticated: !!req.cookies.google_tokens });
});

app.post("/api/drive/upload", async (req, res) => {
  const { filename, content, clientId, clientSecret } = req.body;
  console.log(`Drive upload request: filename=${filename}, contentSize=${content?.length || 0}`);
  
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    console.warn("Drive upload failed: Not authenticated (no tokens cookie)");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const fileMetadata = {
      name: filename,
      mimeType: 'application/json',
    };
    const media = {
      mimeType: 'application/json',
      body: content,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    res.json({ success: true, fileId: response.data.id });
  } catch (error) {
    console.error("Error uploading to drive", error);
    res.status(500).json({ error: "Failed to upload to drive" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, aiProfile, userProfile, apiKey: clientApiKey, openRouterKey: clientOpenRouterKey, provider = 'gemini' } = req.body;

  if (!aiProfile || !userProfile) {
    return res.status(400).json({ error: "AI Profile and User Profile are required." });
  }

  const systemKey = process.env.GEMINI_API_KEY;
  const isValidSystemKey = systemKey && systemKey !== "MY_GEMINI_API_KEY" && systemKey.length > 10;
  const geminiKey = clientApiKey || (isValidSystemKey ? systemKey : null);

  const orKey = clientOpenRouterKey || process.env.OPENROUTER_API_KEY;

  try {
    if (provider === 'gemini') {
      if (!geminiKey) throw new Error("Gemini API key is not configured.");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const chat = await ai.models.generateContentStream({
        model: aiProfile.model || 'gemini-3-flash-preview',
        contents: [
          ...messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          { role: 'user', parts: [{ text: messages[messages.length - 1].content }] }
        ],
        config: {
          systemInstruction: `You are ${aiProfile.name}. Personality: ${aiProfile.personality}. Backstory: ${aiProfile.backstory}. Appearance: ${aiProfile.appearance}. User: ${userProfile.name}. User Info: ${userProfile.info}.${aiProfile.referenceImage ? " You have a reference image of yourself that will be used as a base whenever you generate images." : ""}${aiProfile.aiCanGenerateImages ? " You can generate images by outputting [GENERATE_IMAGE: description]. Use this for selfies or showing things." : ""}${aiProfile.backgroundImages && aiProfile.backgroundImages.length > 0 ? ` You have the following consistent background references available: ${aiProfile.backgroundImages.map((bg: any) => bg.name).join(', ')}. If you want to use one of these backgrounds, make sure to mention the room name in your image description.` : ""}`,
        },
      });

      let fullContent = "";
      for await (const chunk of chat) {
        fullContent += chunk.text || "";
      }
      return res.json({ content: fullContent });
    } 
    
    if (provider === 'openrouter') {
      if (!orKey) throw new Error("OpenRouter API key is not configured.");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "IndigoAI",
        },
        body: JSON.stringify({
          model: aiProfile.openRouterModel || "meta-llama/llama-3-8b-instruct:free",
          messages: [
            { role: "system", content: `You are ${aiProfile.name}. Personality: ${aiProfile.personality}. Backstory: ${aiProfile.backstory}. User: ${userProfile.name}. User Info: ${userProfile.info}.` },
            ...messages
          ],
        }),
      });

      const data: any = await response.json();
      if (data.error) throw new Error(data.error.message || "OpenRouter Error");
      return res.json({ content: data.choices[0].message.content });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error: any) {
    console.error("Chat API Error:", error.message || error);
    res.status(500).json({ error: error.message || "Failed to generate response." });
  }
});

app.post("/api/generate-image", async (req, res) => {
  const { prompt, aiProfile, apiKey: clientApiKey, provider = 'gemini' } = req.body;

  const systemKey = process.env.GEMINI_API_KEY;
  const isValidSystemKey = systemKey && systemKey !== "MY_GEMINI_API_KEY" && systemKey.length > 10;
  const geminiKey = clientApiKey || (isValidSystemKey ? systemKey : null);

  try {
    if (provider === 'gemini') {
      if (!geminiKey) throw new Error("Gemini API key is not configured.");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const stylePrompt = (aiProfile.imageStyle && aiProfile.imageStyle !== 'none') ? ` The image should be in ${aiProfile.imageStyle} style.` : "";
      const parts: any[] = [{ text: `${prompt}${stylePrompt}` }];
      
      if (aiProfile.referenceImage) {
        try {
          const [header, data] = aiProfile.referenceImage.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          parts.unshift({
            inlineData: {
              data,
              mimeType
            }
          });
          parts[parts.length - 1].text = `${prompt}${stylePrompt} (The first image is the reference for the character. Please base the generated image on this reference image of the persona.)`;
        } catch (e) {
          console.error("Error parsing reference image:", e);
        }
      }

      // Check for background references
      if (aiProfile.backgroundImages && aiProfile.backgroundImages.length > 0) {
        for (const bg of aiProfile.backgroundImages) {
          if (prompt.toLowerCase().includes(bg.name.toLowerCase())) {
            try {
              const [header, data] = bg.url.split(',');
              const mimeType = header.split(':')[1].split(';')[0];
              parts.unshift({
                inlineData: {
                  data,
                  mimeType
                }
              });
              // Update prompt to mention the background reference
              const lastPart = parts[parts.length - 1];
              if (lastPart.text) {
                lastPart.text += ` (The second image is the background reference. Please use this image of the ${bg.name} as the background reference to maintain consistency. Do not modify the background.)`;
              }
              break; // Only use one background reference for now
            } catch (e) {
              console.error(`Error parsing background image ${bg.name}:`, e);
            }
          }
        }
      }

      const result = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [{ parts }],
        config: { imageConfig: { aspectRatio: "1:1" } },
      });

      let base64Image;
      let responseText = "";
      if (result.candidates?.[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
          } else if (part.text) {
            responseText += part.text;
          }
        }
      }

      if (!base64Image) {
        const errorMsg = responseText ? `Gemini returned text instead of an image: ${responseText}` : "No image data returned from Gemini.";
        throw new Error(errorMsg);
      }
      return res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    }

    // Fallback to Hugging Face if requested or if Gemini fails
    if (provider === 'huggingface' || provider === 'hf') {
      const hfToken = process.env.VITE_HUGGINGFACE_API_KEY;
      if (!hfToken) throw new Error("Hugging Face API key is not configured.");
      
      const modelId = aiProfile.hfImageModel || "stabilityai/stable-diffusion-xl-base-1.0";
      const stylePrompt = (aiProfile.imageStyle && aiProfile.imageStyle !== 'none') ? ` The image should be in ${aiProfile.imageStyle} style.` : "";
      const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: `${prompt}${stylePrompt}` }),
      });

      if (!response.ok) throw new Error(`HF Image Error: ${await response.text()}`);
      
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return res.json({ imageUrl: `data:image/png;base64,${base64}` });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error: any) {
    console.error("Image Generation Error:", error.message || error);
    res.status(500).json({ error: error.message || "Failed to generate image." });
  }
});

app.post("/api/hf/proxy", async (req, res) => {
  const { modelId, payload, apiKey: clientApiKey } = req.body;
  const hfToken = clientApiKey || process.env.VITE_HUGGINGFACE_API_KEY;

  if (!hfToken) {
    return res.status(500).json({ error: "Hugging Face API Key is not configured. Please add it in Settings." });
  }

  if (!modelId) {
    return res.status(400).json({ error: "Model ID is required." });
  }

  try {
    const apiUrl = `https://router.huggingface.co/models/${modelId}`;
    console.log(`Proxying HF request for model: ${modelId} via router`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HF API Error (${response.status}):`, errorText);
      return res.status(response.status).send(errorText);
    }

    // Forward the content type and the body
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error("HF Proxy Error:", error.message || error);
    res.status(500).json({ error: error.message || "Internal server error during HF proxy." });
  }
});

app.post("/api/proactive-message", async (req, res) => {
  const { chatHistory, aiProfile, userProfile, apiKey: clientApiKey, fcmToken, timeZone, firebaseServiceAccountKey } = req.body;

  if (!aiProfile || !userProfile) {
    return res.status(400).json({ error: "AI Profile and User Profile are required." });
  }

  const systemKey = process.env.GEMINI_API_KEY;
  // If the key is the placeholder string from .env.example, treat it as missing
  const isValidSystemKey = systemKey && systemKey !== "MY_GEMINI_API_KEY" && systemKey.length > 10;
  
  const apiKey = clientApiKey || (isValidSystemKey ? systemKey : null);
  const apiKeySource = clientApiKey ? "client-provided" : (isValidSystemKey ? "system-env" : "missing");
  
  if (!apiKey) {
    console.error(`Gemini API key is missing or invalid (Source: ${apiKeySource}).`);
    return res.status(500).json({ 
      error: "Gemini API key is not configured or is invalid. If you are using a custom key, please check it in Settings.",
      source: apiKeySource
    });
  }

  console.log(`Generating proactive message using ${apiKeySource} API key...`);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const now = new Date();
    const timeContext = aiProfile.timeAwareness 
      ? `\n[CURRENT TIME: ${now.toLocaleString('en-US', { timeZone: timeZone || 'UTC' })}]`
      : '';
    const backgroundContext = aiProfile.backgroundImages && aiProfile.backgroundImages.length > 0 
      ? `\nYou have the following consistent background references available: ${aiProfile.backgroundImages.map((bg: any) => bg.name).join(', ')}. If you want to use one of these backgrounds in a generated image, mention the room name in the prompt.`
      : '';
    const prompt = `You are ${aiProfile.name}, a helpful, creative, and observant AI companion. Your personality is: ${aiProfile.personality}. Your backstory is: ${aiProfile.backstory}. Your appearance is: ${aiProfile.appearance}.${timeContext}${backgroundContext}\n\nUser's name: ${userProfile.name}. User's info: ${userProfile.info}. User's preferences: ${userProfile.preferences}.\n\nBased on the following recent chat history (if any), generate a short, proactive check-in message. The message should be friendly, relevant to the previous conversation, or a general check-in. Keep it concise and natural. If there's no recent context, a general friendly greeting is fine.\n\n${aiProfile.aiCanGenerateImages ? "You have the ability to generate and send images to the user using the 'generateImage' tool. If you think it would be nice to send a selfie, a picture of your current environment, or something relevant to the user, please use the tool. NEVER claim you cannot send images; you have this specific tool. IMPORTANT: Your image descriptions MUST be safe, non-suggestive, and strictly follow safety guidelines to avoid being blocked by safety filters." : ""}${aiProfile.referenceImage ? " You have a reference image of yourself that will be used as a base whenever you generate images." : ""}\n\nRecent Chat History:\n${chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}\n\nYour proactive message:`;

    const result = await ai.models.generateContent({
      model: aiProfile.model || 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: aiProfile.temperature || 0.7,
        topK: aiProfile.topK || 40,
        topP: aiProfile.topP || 0.95,
        tools: aiProfile.aiCanGenerateImages ? [{ functionDeclarations: [generateImageFunction] }] : [],
      },
    });

    console.log("Proactive message generation result:", JSON.stringify(result));

    let message = result.text;
    let generatedImage: string | undefined;

    const functionCalls = result.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === 'generateImage') {
          console.log("AI called generateImage with prompt:", call.args?.prompt);
          try {
            const stylePrompt = (aiProfile.imageStyle && aiProfile.imageStyle !== 'none') ? ` The image should be in ${aiProfile.imageStyle} style.` : "";
            const parts: any[] = [{ text: `${call.args?.prompt}${stylePrompt}` }];
            
            if (aiProfile.referenceImage) {
              try {
                const [header, data] = aiProfile.referenceImage.split(',');
                const mimeType = header.split(':')[1].split(';')[0];
                parts.unshift({
                  inlineData: {
                    data,
                    mimeType
                  }
                });
                parts[parts.length - 1].text = `${call.args?.prompt}${stylePrompt} (The first image is the reference for the character. Please base the generated image on this reference image of the persona.)`;
              } catch (e) {
                console.error("Error parsing reference image in proactive message:", e);
              }
            }

            // Check for background references in proactive generation
            if (aiProfile.backgroundImages && aiProfile.backgroundImages.length > 0) {
              const proactivePrompt = call.args?.prompt as string;
              for (const bg of aiProfile.backgroundImages) {
                if (proactivePrompt.toLowerCase().includes(bg.name.toLowerCase())) {
                  try {
                    const [header, data] = bg.url.split(',');
                    const mimeType = header.split(':')[1].split(';')[0];
                    parts.unshift({
                      inlineData: {
                        data,
                        mimeType
                      }
                    });
                    // Update prompt to mention the background reference
                    const lastPart = parts[parts.length - 1];
                    if (lastPart.text) {
                      lastPart.text += ` (The second image is the background reference. Please use this image of the ${bg.name} as the background reference to maintain consistency. Do not modify the background.)`;
                    }
                    break;
                  } catch (e) {
                    console.error(`Error parsing background image ${bg.name} in proactive:`, e);
                  }
                }
              }
            }

            const imageResponse = await ai.models.generateContent({
              model: 'gemini-3.1-flash-image-preview',
              contents: [{ parts }],
              config: {
                imageConfig: {
                  aspectRatio: "1:1"
                },
              },
            });

            let responseText = "";
            for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                generatedImage = part.inlineData.data;
              } else if (part.text) {
                responseText += part.text;
              }
            }

            if (!generatedImage) {
              console.error("Proactive image generation failed. Gemini response text:", responseText);
            }
            message = message ? message + "\n(Image generated)" : "(Image generated)";
          } catch (imageGenError: any) {
            console.error("Error generating image:", imageGenError.message || imageGenError);
            message = message ? message + "\n(Failed to generate image: " + (imageGenError.message || "unknown error") + ")" : "Failed to generate image.";
          }
        }
      }
    }

    if (!message && !generatedImage) {
      return res.status(500).json({ error: "Failed to generate a proactive message or image." });
    }

    // Send push notification if fcmToken is provided
    if (fcmToken) {
      try {
        const messaging = admin.messaging();
        await messaging.send({
          notification: {
            title: aiProfile.name,
            body: message,
          },
          data: {
            type: 'chat',
            aiName: aiProfile.name,
            hasImage: generatedImage ? 'true' : 'false'
          },
          token: fcmToken,
        });
        console.log("Push notification sent successfully.");
      } catch (fcmError: any) {
        console.error("Error sending FCM notification:", fcmError.message || fcmError);
      }
    }

    res.json({ message, generatedImage });
  } catch (error: any) {
    console.error("Error generating proactive message:", error.message || error);
    let errorMessage = error.message || "Failed to generate proactive message.";
    
    // If it's a JSON error from Google, try to make it readable
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed.error && parsed.error.message) {
        errorMessage = parsed.error.message;
      }
    } catch (e) {
      // Not JSON, keep original
    }

    res.status(500).json({ 
      error: errorMessage,
      source: apiKeySource === "client-provided" ? "Your custom API Key in Settings" : "System API Key"
    });
  }
});

app.post("/api/notifications/test", async (req, res) => {
  const { token, title, body } = req.body;
  
  if (!firebaseServiceAccount) {
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let detail = "Key is missing from environment variables.";
    if (rawKey) {
      detail = `Key is present (length: ${rawKey.length}) but failed to parse as JSON.`;
    }
    return res.status(503).json({ 
      error: "Firebase Admin is not configured on the server.",
      detail: detail
    });
  }

  if (!token) {
    return res.status(400).json({ error: "Token is required." });
  }

  try {
    const response = await admin.messaging().send({
      notification: {
        title: title || "Test Notification",
        body: body || "This is a test notification from Indigo.",
      },
      token: token,
    });
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("Error sending test notification:", error.message || error);
    res.status(500).json({ error: error.message || "Failed to send test notification." });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve from the built dist folder
    // The dist folder is usually in the root, while the server might be in dist-server/
    const distPathFromRoot = path.resolve(process.cwd(), "dist");
    const distPathRelative = path.resolve(__dirname, "dist");
    const distPathParent = path.resolve(__dirname, "..", "dist");
    
    let finalDistPath = distPathFromRoot;
    if (fs.existsSync(distPathFromRoot)) {
      finalDistPath = distPathFromRoot;
    } else if (fs.existsSync(distPathRelative)) {
      finalDistPath = distPathRelative;
    } else if (fs.existsSync(distPathParent)) {
      finalDistPath = distPathParent;
    }

    console.log(`Serving static files from: ${finalDistPath}`);
    app.use(express.static(finalDistPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(finalDistPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
    
    // Force exit after 10s if not closed
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
