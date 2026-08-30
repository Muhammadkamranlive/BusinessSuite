import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { sanitizeFileName } from "@/modules/documents/model";

export type UploadedBlob = {
  storagePath: string;
  downloadURL: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extension: string;
};

const IDB_NAME = "businesssuite-docs";
const IDB_STORE = "blobs";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(path: string, blob: Blob) {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(blob, path);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(path: string): Promise<Blob | null> {
  const db = await openIdb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(path);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

async function idbDelete(path: string) {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(path);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/**
 * Upload a file for a tenant. Uses Supabase Storage when configured,
 * otherwise IndexedDB (demo / offline-friendly local backend).
 */
export async function uploadDocumentFile(input: {
  tenantId: string;
  ownerKey: string;
  file: File;
  prefix?: string;
  onProgress?: (pct: number) => void;
}): Promise<UploadedBlob> {
  const { tenantId, ownerKey, file, prefix = "documents", onProgress } = input;
  const safe = sanitizeFileName(file.name);
  const storagePath = `tenants/${tenantId}/${ownerKey}/${prefix}/${Date.now()}-${safe}`;
  const extension = extensionOf(file.name);
  const fileType = file.type || "application/octet-stream";

  onProgress?.(5);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      onProgress?.(20);
      const { error } = await supabase.storage.from("hrm-documents").upload(storagePath, file, {
        contentType: fileType,
        upsert: false
      });
      if (error) throw error;
      onProgress?.(80);
      const { data } = supabase.storage.from("hrm-documents").getPublicUrl(storagePath);
      // Prefer signed URL for private buckets
      const signed = await supabase.storage.from("hrm-documents").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      onProgress?.(100);
      return {
        storagePath,
        downloadURL: signed.data?.signedUrl || data.publicUrl,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        extension
      };
    } catch {
      // Fall through to IndexedDB if bucket missing / RLS blocks
    }
  }

  onProgress?.(40);
  await idbPut(storagePath, file);
  onProgress?.(80);
  const objectUrl = URL.createObjectURL(file);
  // Persist a recoverable data URL for small files so reloads still work
  if (file.size <= 1.5 * 1024 * 1024) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    onProgress?.(100);
    return {
      storagePath,
      downloadURL: dataUrl,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      extension
    };
  }

  onProgress?.(100);
  return {
    storagePath,
    downloadURL: objectUrl,
    fileName: file.name,
    fileType,
    fileSize: file.size,
    extension
  };
}

export async function resolveDocumentUrl(storagePath: string, fallbackUrl: string) {
  if (fallbackUrl.startsWith("data:") || fallbackUrl.startsWith("blob:") || fallbackUrl.startsWith("http")) {
    if (fallbackUrl.startsWith("blob:")) {
      const blob = await idbGet(storagePath);
      if (blob) return URL.createObjectURL(blob);
    }
    return fallbackUrl;
  }
  const blob = await idbGet(storagePath);
  if (blob) return URL.createObjectURL(blob);
  return fallbackUrl;
}

export async function deleteDocumentBlob(storagePath: string) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.storage.from("hrm-documents").remove([storagePath]);
    } catch {
      // ignore
    }
  }
  try {
    await idbDelete(storagePath);
  } catch {
    // ignore
  }
}
