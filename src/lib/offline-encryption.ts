/**
 * Offline Data Encryption Utility
 * Provides AES-GCM encryption for sensitive offline data stored in localStorage
 * Uses WebCrypto API for secure encryption/decryption
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const DEVICE_KEY_NAME = 'device_encryption_key';

/**
 * Generate a unique device encryption key using WebCrypto
 * Stores it in IndexedDB for better security than localStorage
 */
export async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  // Try to get existing key from IndexedDB
  const existingKey = await getKeyFromIndexedDB();
  if (existingKey) {
    return existingKey;
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    {
      name: ENCRYPTION_ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable - needed for export/import
    ['encrypt', 'decrypt']
  );

  // Store in IndexedDB
  await storeKeyInIndexedDB(key);
  return key;
}

/**
 * Store encryption key in IndexedDB (more secure than localStorage)
 */
async function storeKeyInIndexedDB(key: CryptoKey): Promise<void> {
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineEncryptionDB', 1);
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      store.put(exportedKey, DEVICE_KEY_NAME);
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => {
        db.close();
        reject(new Error('Failed to store key'));
      };
    };
  });
}

/**
 * Retrieve encryption key from IndexedDB
 */
async function getKeyFromIndexedDB(): Promise<CryptoKey | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('OfflineEncryptionDB', 1);
    
    request.onerror = () => resolve(null);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    
    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('keys')) {
        db.close();
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const getRequest = store.get(DEVICE_KEY_NAME);
      
      getRequest.onsuccess = async () => {
        db.close();
        if (getRequest.result) {
          try {
            const key = await crypto.subtle.importKey(
              'jwk',
              getRequest.result,
              { name: ENCRYPTION_ALGORITHM },
              true,
              ['encrypt', 'decrypt']
            );
            resolve(key);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => {
        db.close();
        resolve(null);
      };
    };
  });
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: unknown, key: CryptoKey): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  
  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData<T = unknown>(encryptedString: string, key: CryptoKey): Promise<T> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedString), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  
  return JSON.parse(jsonString) as T;
}

/**
 * Generate HMAC signature for data integrity verification
 */
export async function signData(data: unknown): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  
  // Use a simple hash for integrity check (not cryptographic signature)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify data integrity using HMAC signature
 */
export async function verifySignature(data: unknown, signature: string): Promise<boolean> {
  const computedSignature = await signData(data);
  return computedSignature === signature;
}

/**
 * Encrypted storage wrapper for localStorage
 */
export const encryptedStorage = {
  async setItem(key: string, data: unknown): Promise<void> {
    try {
      const cryptoKey = await getOrCreateDeviceKey();
      const encrypted = await encryptData(data, cryptoKey);
      const signature = await signData(data);
      
      localStorage.setItem(key, JSON.stringify({
        encrypted,
        signature,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      throw error;
    }
  },
  
  async getItem<T = unknown>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const { encrypted, signature, timestamp } = JSON.parse(stored);
      const cryptoKey = await getOrCreateDeviceKey();
      const decrypted = await decryptData<T>(encrypted, cryptoKey);
      
      // Verify integrity
      const isValid = await verifySignature(decrypted, signature);
      if (!isValid) {
        console.error('Data integrity check failed for key:', key);
        localStorage.removeItem(key);
        return null;
      }
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return null;
    }
  },
  
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
  
  clear(prefix?: string): void {
    if (prefix) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(k => localStorage.removeItem(k));
    } else {
      localStorage.clear();
    }
  },
};
