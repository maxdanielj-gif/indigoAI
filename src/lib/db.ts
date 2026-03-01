import { Message, Memory, JournalEntry, GalleryImage, AIProfile, UserProfile, AppSettings, DEFAULT_AI_PROFILE, DEFAULT_USER_PROFILE, DEFAULT_SETTINGS } from './types';

const DB_NAME = 'IndigoAI_DB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

// Image storage in IndexedDB
export async function saveImage(image: GalleryImage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').put(image);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImages(): Promise<GalleryImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const req = tx.objectStore('images').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// localStorage helpers for text data
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to load ${key}`, e);
  }
  return fallback;
}

function saveJSON<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key}`, e);
  }
}

// Messages
export function loadMessages(): Message[] {
  return loadJSON<Message[]>('indigo_messages', []);
}
export function saveMessages(msgs: Message[]): void {
  saveJSON('indigo_messages', msgs);
}

// Memories
export function loadMemories(): Memory[] {
  return loadJSON<Memory[]>('indigo_memories', []);
}
export function saveMemories(mems: Memory[]): void {
  saveJSON('indigo_memories', mems);
}

// Journal
export function loadJournal(): JournalEntry[] {
  return loadJSON<JournalEntry[]>('indigo_journal', []);
}
export function saveJournal(entries: JournalEntry[]): void {
  saveJSON('indigo_journal', entries);
}

// AI Profile
export function loadAIProfile(): AIProfile {
  return loadJSON<AIProfile>('indigo_ai_profile', DEFAULT_AI_PROFILE);
}
export function saveAIProfile(profile: AIProfile): void {
  saveJSON('indigo_ai_profile', profile);
}

// User Profile
export function loadUserProfile(): UserProfile {
  return loadJSON<UserProfile>('indigo_user_profile', DEFAULT_USER_PROFILE);
}
export function saveUserProfile(profile: UserProfile): void {
  saveJSON('indigo_user_profile', profile);
}

// Settings
export function loadSettings(): AppSettings {
  return loadJSON<AppSettings>('indigo_settings', DEFAULT_SETTINGS);
}
export function saveSettings(settings: AppSettings): void {
  saveJSON('indigo_settings', settings);
}

// Export all data
export async function exportAllData(): Promise<string> {
  const images = await getImages();
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    messages: loadMessages(),
    memories: loadMemories(),
    journal: loadJournal(),
    aiProfile: loadAIProfile(),
    userProfile: loadUserProfile(),
    settings: loadSettings(),
    images: images,
  };
  return JSON.stringify(data, null, 2);
}

// Import all data
export async function importAllData(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  if (data.messages) saveMessages(data.messages);
  if (data.memories) saveMemories(data.memories);
  if (data.journal) saveJournal(data.journal);
  if (data.aiProfile) saveAIProfile(data.aiProfile);
  if (data.userProfile) saveUserProfile(data.userProfile);
  if (data.settings) saveSettings(data.settings);
  if (data.images) {
    await clearImages();
    for (const img of data.images) {
      await saveImage(img);
    }
  }
}

// Clear chat history only
export function clearChatHistory(): void {
  saveMessages([]);
}

// Reset ALL data
export async function resetAllData(): Promise<void> {
  localStorage.removeItem('indigo_messages');
  localStorage.removeItem('indigo_memories');
  localStorage.removeItem('indigo_journal');
  localStorage.removeItem('indigo_ai_profile');
  localStorage.removeItem('indigo_user_profile');
  localStorage.removeItem('indigo_settings');
  await clearImages();
}

// Generate backup filename
export function generateBackupFilename(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  return `indigoAI_backup_${ts}.json`;
}
