import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { toast } from 'sonner';

interface PendingPhoto {
  id: string;
  assetId: string;
  file: Blob;
  fileName: string;
  mimeType: string;
  capturedAt: string;
  retryCount: number;
}

const DB_NAME = 'dhuud-offline-photos';
const DB_VERSION = 1;
const STORE_NAME = 'pending_photos';
const MAX_RETRIES = 3;

class OfflinePhotoStore {
  private db: IDBDatabase | null = null;

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('assetId', 'assetId', { unique: false });
        }
      };
    });
  }

  async add(photo: PendingPhoto): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = tx.objectStore(STORE_NAME).put(photo);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<PendingPhoto[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.openDB();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const photoStore = new OfflinePhotoStore();

export function useOfflineAssetPhotos() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    photoStore.count().then(setPendingCount);
  }, []);

  const queuePhoto = useCallback(async (assetId: string, file: File): Promise<string> => {
    const id = crypto.randomUUID();
    const blob = await file.arrayBuffer().then((buf) => new Blob([buf], { type: file.type }));

    await photoStore.add({
      id,
      assetId,
      file: blob,
      fileName: file.name,
      mimeType: file.type,
      capturedAt: new Date().toISOString(),
      retryCount: 0,
    });

    setPendingCount(await photoStore.count());
    return id;
  }, []);

  const syncPhotos = useCallback(async () => {
    if (!profile?.tenant_id || !user?.id || isSyncing) return;

    const pending = await photoStore.getAll();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const photo of pending) {
      try {
        const filePath = `${profile.tenant_id}/${photo.assetId}/${Date.now()}-${photo.fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('asset-files')
          .upload(filePath, photo.file, { contentType: photo.mimeType });

        if (uploadError) throw uploadError;

        await supabase.from('asset_photos').insert({
          asset_id: photo.assetId,
          tenant_id: profile.tenant_id,
          storage_path: filePath,
          file_name: photo.fileName,
          mime_type: photo.mimeType,
          file_size: photo.file.size,
          uploaded_by: user.id,
        });

        await photoStore.delete(photo.id);
        successCount++;
      } catch (error) {
        console.error('Sync failed:', error);
        if (photo.retryCount >= MAX_RETRIES) {
          await photoStore.delete(photo.id);
        }
      }
    }

    setPendingCount(await photoStore.count());
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`Synced ${successCount} photos`);
      queryClient.invalidateQueries({ queryKey: ['asset-photos'] });
    }
  }, [profile?.tenant_id, user?.id, isSyncing, queryClient]);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncPhotos();
    }
  }, [isOnline, pendingCount, isSyncing, syncPhotos]);

  return { pendingCount, isSyncing, queuePhoto, syncPhotos };
}
