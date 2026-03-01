/**
 * End-to-end encryption for cloud sync.
 * Uses AES-256-GCM with PBKDF2 key derivation from a user passphrase.
 * The passphrase never leaves the device.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  salt: string;       // base64
}

/**
 * Encrypt a plaintext string using AES-256-GCM with a passphrase.
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv.buffer),
    salt: bufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt an encrypted payload using AES-256-GCM with a passphrase.
 */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const cipherBuffer = base64ToBuffer(payload.ciphertext);
  const key = await deriveKey(passphrase, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Generate a SHA-256 hash of data for change detection (not for security).
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate that a passphrase can decrypt a payload (used to verify passphrase on login).
 */
export async function validatePassphrase(payload: EncryptedPayload, passphrase: string): Promise<boolean> {
  try {
    await decrypt(payload, passphrase);
    return true;
  } catch {
    return false;
  }
}
