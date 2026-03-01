/**
 * Cloud sync module.
 * Encrypts all data client-side before uploading to Supabase.
 * Supports conflict resolution via last-modified timestamps.
 */

import { supabase } from './supabase';
import { encrypt, decrypt, hashData, EncryptedPayload } from './encryption';
import * as db from './db';
import type { Message, GalleryImage } from './types';

export type SyncDataType = 'messages' | 'memories' | 'journal' | 'ai_profile' | 'user_profile' | 'settings' | 'images_meta';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

export interface SyncResult {
  status: SyncStatus;
  message: string;
  conflicts?: SyncDataType[];
}

export interface SyncState {
  enabled: boolean;
  lastSyncAt: number;
  encryptionPassphrase: string; // stored locally only, never sent to server
  autoSync: boolean;
  syncImages: boolean;
}

export const DEFAULT_SYNC_STATE: SyncState = {
  enabled: false,
  lastSyncAt: 0,
  encryptionPassphrase: '',
  autoSync: false,
  syncImages: false,
};

// ── helpers ──────────────────────────────────────────────────────────

function loadSyncState(): SyncState {
  try {
    const raw = localStorage.getItem('indigo_sync_state');
    if (raw) return { ...DEFAULT_SYNC_STATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SYNC_STATE;
}

function saveSyncState(state: SyncState): void {
  localStorage.setItem('indigo_sync_state', JSON.stringify(state));
}

function getLocalTimestamp(dataType: SyncDataType): number {
  try {
    const raw = localStorage.getItem(`indigo_sync_ts_${dataType}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

function setLocalTimestamp(dataType: SyncDataType, ts: number): void {
  localStorage.setItem(`indigo_sync_ts_${dataType}`, ts.toString());
}

// Strip heavy fields from messages before sync (images stay local)
function stripMessagesForSync(messages: Message[]): Message[] {
  return messages.map(m => ({
    ...m,
    imageUrl: m.imageUrl ? '[synced-image-placeholder]' : undefined,
    fileContent: undefined,
  }));
}

// Strip dataUrl from images for metadata-only sync
function stripImagesForSync(images: GalleryImage[]): Omit<GalleryImage, 'dataUrl'>[] {
  return images.map(({ dataUrl, ...rest }) => rest);
}

// ── core sync functions ─────────────────────────────────────────────

/**
 * Upload a single data type to the cloud (encrypted).
 */
async function uploadDataType(
  userId: string,
  dataType: SyncDataType,
  plaintext: string,
  passphrase: string,
): Promise<void> {
  const payload = await encrypt(plaintext, passphrase);
  const hash = await hashData(plaintext);
  const now = Date.now();

  const { error } = await supabase
    .from('sync_data')
    .upsert({
      user_id: userId,
      data_type: dataType,
      encrypted_data: payload.ciphertext,
      iv: payload.iv,
      salt: payload.salt,
      data_hash: hash,
      last_modified: now,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,data_type' });

  if (error) throw new Error(`Upload ${dataType} failed: ${error.message}`);
  setLocalTimestamp(dataType, now);
}

/**
 * Download a single data type from the cloud (decrypted).
 */
async function downloadDataType(
  userId: string,
  dataType: SyncDataType,
  passphrase: string,
): Promise<{ data: string; lastModified: number } | null> {
  const { data, error } = await supabase
    .from('sync_data')
    .select('encrypted_data, iv, salt, last_modified')
    .eq('user_id', userId)
    .eq('data_type', dataType)
    .maybeSingle();

  if (error) throw new Error(`Download ${dataType} failed: ${error.message}`);
  if (!data) return null;

  const payload: EncryptedPayload = {
    ciphertext: data.encrypted_data,
    iv: data.iv,
    salt: data.salt,
  };

  const plaintext = await decrypt(payload, passphrase);
  return { data: plaintext, lastModified: data.last_modified };
}

/**
 * Check remote timestamp for a data type.
 */
async function getRemoteTimestamp(userId: string, dataType: SyncDataType): Promise<number> {
  const { data, error } = await supabase
    .from('sync_data')
    .select('last_modified')
    .eq('user_id', userId)
    .eq('data_type', dataType)
    .maybeSingle();

  if (error || !data) return 0;
  return data.last_modified || 0;
}

// ── data collectors ─────────────────────────────────────────────────

function getLocalData(dataType: SyncDataType): string {
  switch (dataType) {
    case 'messages':
      return JSON.stringify(stripMessagesForSync(db.loadMessages()));
    case 'memories':
      return JSON.stringify(db.loadMemories());
    case 'journal':
      return JSON.stringify(db.loadJournal());
    case 'ai_profile':
      return JSON.stringify(db.loadAIProfile());
    case 'user_profile':
      return JSON.stringify(db.loadUserProfile());
    case 'settings': {
      // Strip API keys from synced settings for safety
      const settings = db.loadSettings();
      return JSON.stringify({ ...settings, llmApiKey: '', imageApiKey: '' });
    }
    case 'images_meta':
      return '[]'; // handled async
    default:
      return '{}';
  }
}

function applyRemoteData(dataType: SyncDataType, jsonStr: string): void {
  const parsed = JSON.parse(jsonStr);
  switch (dataType) {
    case 'messages':
      db.saveMessages(parsed);
      break;
    case 'memories':
      db.saveMemories(parsed);
      break;
    case 'journal':
      db.saveJournal(parsed);
      break;
    case 'ai_profile':
      db.saveAIProfile(parsed);
      break;
    case 'user_profile':
      db.saveUserProfile(parsed);
      break;
    case 'settings': {
      // Preserve local API keys when pulling remote settings
      const localSettings = db.loadSettings();
      db.saveSettings({
        ...parsed,
        llmApiKey: localSettings.llmApiKey,
        imageApiKey: localSettings.imageApiKey,
      });
      break;
    }
  }
}

// ── public API ──────────────────────────────────────────────────────

const SYNC_TYPES: SyncDataType[] = [
  'messages', 'memories', 'journal', 'ai_profile', 'user_profile', 'settings',
];

/**
 * Full bidirectional sync with conflict resolution.
 * Strategy: last-write-wins per data type.
 */
export async function performSync(
  userId: string,
  passphrase: string,
  onProgress?: (msg: string) => void,
): Promise<SyncResult> {
  const conflicts: SyncDataType[] = [];

  for (const dataType of SYNC_TYPES) {
    try {
      onProgress?.(`Syncing ${dataType}...`);

      const localTs = getLocalTimestamp(dataType);
      const remoteTs = await getRemoteTimestamp(userId, dataType);
      const localData = dataType === 'images_meta' ? '[]' : getLocalData(dataType);
      const localHash = await hashData(localData);

      if (remoteTs === 0) {
        // No remote data – push local
        onProgress?.(`Uploading ${dataType}...`);
        await uploadDataType(userId, dataType, localData, passphrase);
      } else if (localTs >= remoteTs) {
        // Local is newer or equal – check if data actually changed
        const remote = await downloadDataType(userId, dataType, passphrase);
        if (remote) {
          const remoteHash = await hashData(remote.data);
          if (localHash !== remoteHash) {
            // Local changed, push
            onProgress?.(`Uploading ${dataType}...`);
            await uploadDataType(userId, dataType, localData, passphrase);
          }
        }
      } else {
        // Remote is newer – pull
        onProgress?.(`Downloading ${dataType}...`);
        const remote = await downloadDataType(userId, dataType, passphrase);
        if (remote) {
          applyRemoteData(dataType, remote.data);
          setLocalTimestamp(dataType, remote.lastModified);
        }
      }
    } catch (err: any) {
      console.error(`Sync error for ${dataType}:`, err);
      conflicts.push(dataType);
    }
  }

  const state = loadSyncState();
  state.lastSyncAt = Date.now();
  saveSyncState(state);

  if (conflicts.length > 0) {
    return {
      status: 'error',
      message: `Sync completed with errors in: ${conflicts.join(', ')}`,
      conflicts,
    };
  }

  return { status: 'success', message: 'All data synced successfully' };
}

/**
 * Force push all local data to cloud (overwrites remote).
 */
export async function forcePush(
  userId: string,
  passphrase: string,
  onProgress?: (msg: string) => void,
): Promise<SyncResult> {
  for (const dataType of SYNC_TYPES) {
    try {
      onProgress?.(`Force uploading ${dataType}...`);
      const localData = getLocalData(dataType);
      await uploadDataType(userId, dataType, localData, passphrase);
    } catch (err: any) {
      return { status: 'error', message: `Force push failed at ${dataType}: ${err.message}` };
    }
  }

  const state = loadSyncState();
  state.lastSyncAt = Date.now();
  saveSyncState(state);

  return { status: 'success', message: 'All local data pushed to cloud' };
}

/**
 * Force pull all cloud data to local (overwrites local).
 */
export async function forcePull(
  userId: string,
  passphrase: string,
  onProgress?: (msg: string) => void,
): Promise<SyncResult> {
  for (const dataType of SYNC_TYPES) {
    try {
      onProgress?.(`Force downloading ${dataType}...`);
      const remote = await downloadDataType(userId, dataType, passphrase);
      if (remote) {
        applyRemoteData(dataType, remote.data);
        setLocalTimestamp(dataType, remote.lastModified);
      }
    } catch (err: any) {
      return { status: 'error', message: `Force pull failed at ${dataType}: ${err.message}` };
    }
  }

  const state = loadSyncState();
  state.lastSyncAt = Date.now();
  saveSyncState(state);

  return { status: 'success', message: 'All cloud data pulled to device' };
}

/**
 * Delete all cloud data for a user.
 */
export async function deleteCloudData(userId: string): Promise<void> {
  const { error } = await supabase
    .from('sync_data')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Delete cloud data failed: ${error.message}`);

  // Clear local sync timestamps
  for (const dt of SYNC_TYPES) {
    localStorage.removeItem(`indigo_sync_ts_${dt}`);
  }
}

export { loadSyncState, saveSyncState };
