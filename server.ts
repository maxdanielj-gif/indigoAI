import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

console.log(`Server starting in ${process.env.NODE_ENV || 'development'} mode`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";

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

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const getOAuth2Client = () => {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/auth/google/callback`
  );
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/google/url", (req, res) => {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  res.json({ url });
});

app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code } = req.query;
  const oauth2Client = getOAuth2Client();
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
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client();
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
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client();
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
  const { filename, content } = req.body;
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client();
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

app.post("/api/proactive-message", async (req, res) => {
  const { chatHistory, aiProfile, userProfile, apiKey: clientApiKey, fcmToken, isAmbient, timeSinceLastInteraction } = req.body;

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

  console.log(`Generating ${isAmbient ? 'ambient' : 'proactive'} message using ${apiKeySource} API key...`);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const now = new Date();
    const timeContext = aiProfile.timeAwareness 
      ? `\n[CURRENT TIME: ${now.toLocaleString()}]`
      : '';
    
    let ambientContext = '';
    if (isAmbient) {
      const inactivityText = timeSinceLastInteraction ? ` It has been about ${timeSinceLastInteraction} minutes since the user last interacted with you.` : '';
      ambientContext = `\n[AMBIENT MODE: The user is currently inactive or just going about their day.${inactivityText} Generate a message that feels like a natural, low-pressure observation or a gentle check-in. It should feel like you are "present" in their environment or thinking of them, rather than just asking a question.]`;
    }

    const prompt = `You are ${aiProfile.name}, a helpful, creative, and observant AI companion. Your personality is: ${aiProfile.personality}. Your backstory is: ${aiProfile.backstory}.${timeContext}${ambientContext}\n\nUser's name: ${userProfile.name}. User's info: ${userProfile.info}. User's preferences: ${userProfile.preferences}.\n\nBased on the following recent chat history (if any), generate a short, ${isAmbient ? 'ambient' : 'proactive'} check-in message. The message should be friendly, relevant to the previous conversation, or a general check-in. Keep it concise and natural. If there's no recent context, a general friendly greeting is fine.\n\nRecent Chat History:\n${chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}\n\nYour ${isAmbient ? 'ambient' : 'proactive'} message:`;

    const result = await ai.models.generateContent({
      model: aiProfile.model || 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: aiProfile.temperature || 0.7,
        topK: aiProfile.topK || 40,
        topP: aiProfile.topP || 0.95,
      },
    });

    const message = result.text;

    if (!message) {
      return res.status(500).json({ error: "Failed to generate a proactive message." });
    }

    // Send push notification if fcmToken is provided and Firebase Admin is initialized
    if (fcmToken && firebaseServiceAccount) {
      try {
        await admin.messaging().send({
          notification: {
            title: aiProfile.name,
            body: message,
          },
          data: {
            type: 'chat',
            aiName: aiProfile.name
          },
          token: fcmToken,
        });
        console.log("Push notification sent successfully to token:", fcmToken);
      } catch (fcmError: any) {
        console.error("Error sending FCM notification:", fcmError.message || fcmError);
        // We don't fail the request if FCM fails, just log it
      }
    }

    res.json({ message });
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
