"use client";
import { getSupabase, PHOTO_BUCKET } from "./supabase";

// Fotos privadas:
//  • Con Supabase: Storage privado (bucket progress-photos, carpeta <user_id>/), URLs firmadas temporales.
//  • Modo local: IndexedDB del navegador (nunca salen del dispositivo).

const DB_NAME = "p90-photos";
const STORE = "blobs";

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function idbPut(key: string, blob: Blob) {
  const db = await idb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key: string): Promise<Blob | null> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res((r.result as Blob) ?? null);
    r.onerror = () => rej(r.error);
  });
}
async function idbDel(key: string) {
  const db = await idb();
  await new Promise<void>((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res();
  });
}

/** Redimensiona a máx. 1400 px y comprime a JPEG para ahorrar espacio. */
export async function compressImage(file: File, max = 1400, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}

export async function savePhoto(id: string, blob: Blob, userId: string | null): Promise<string> {
  const sb = getSupabase();
  if (sb && userId) {
    const path = `${userId}/${id}.jpg`;
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    return path;
  }
  await idbPut(id, blob);
  return `local:${id}`;
}

const urlCache = new Map<string, string>();
export async function photoURL(path: string): Promise<string | null> {
  if (urlCache.has(path)) return urlCache.get(path)!;
  let url: string | null = null;
  if (path.startsWith("local:")) {
    const blob = await idbGet(path.slice(6));
    if (blob) url = URL.createObjectURL(blob);
  } else {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
      url = data?.signedUrl ?? null;
    }
  }
  if (url) urlCache.set(path, url);
  return url;
}

export async function deletePhotoFile(path: string) {
  urlCache.delete(path);
  if (path.startsWith("local:")) return idbDel(path.slice(6));
  const sb = getSupabase();
  if (sb) await sb.storage.from(PHOTO_BUCKET).remove([path]);
}
