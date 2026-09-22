import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { sanitizeFileName } from "@/modules/documents/model";

export type HmsUploadedBlob = {
  storagePath: string;
  downloadURL: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extension: string;
};

const BUCKET = "hms-documents";
const IDB_NAME = "businesssuite-hms-docs";
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

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** Upload PHI clinical documents — private bucket, signed URLs only. */
export async function uploadHmsDocument(input: {
  tenantId: string;
  ownerKey: string;
  file: File;
  prefix?: string;
  onProgress?: (pct: number) => void;
}): Promise<HmsUploadedBlob> {
  const { tenantId, ownerKey, file, prefix = "emr", onProgress } = input;
  const safe = sanitizeFileName(file.name);
  const storagePath = `tenants/${tenantId}/${ownerKey}/${prefix}/${Date.now()}-${safe}`;
  const extension = extensionOf(file.name);
  const fileType = file.type || "application/octet-stream";

  onProgress?.(5);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      onProgress?.(20);
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
        contentType: fileType,
        upsert: false
      });
      if (error) throw error;
      onProgress?.(80);
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      onProgress?.(100);
      return {
        storagePath,
        downloadURL: signed.data?.signedUrl ?? "",
        fileName: file.name,
        fileType,
        fileSize: file.size,
        extension
      };
    } catch {
      /* fall through to IndexedDB */
    }
  }

  onProgress?.(40);
  await idbPut(storagePath, file);
  onProgress?.(80);
  const objectUrl = URL.createObjectURL(file);
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

export async function resolveHmsDocumentUrl(storagePath: string, fallbackUrl: string) {
  if (fallbackUrl.startsWith("data:") || fallbackUrl.startsWith("blob:") || fallbackUrl.startsWith("http")) {
    if (fallbackUrl.startsWith("blob:")) {
      const blob = await idbGet(storagePath);
      if (blob) return URL.createObjectURL(blob);
    }
    return fallbackUrl;
  }
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
      if (signed.data?.signedUrl) return signed.data.signedUrl;
    } catch {
      /* ignore */
    }
  }
  const blob = await idbGet(storagePath);
  if (blob) return URL.createObjectURL(blob);
  return fallbackUrl;
}
