import { collection, deleteDoc, doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function scopedStorageKey(key: string, userId: string): string {
  return `${key}:${userId}`;
}

const syncedKeys = [
  "personal-life-settings-v1",
  "personal-life-api-config-v1",
  "personal-life-nutrition-v1",
  "personal-life-finance-v1",
  "personal-life-workout-v1",
  "personal-life-time-v1",
  "personal-life-daily-log-v1",
];

function firestoreKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function syncUserStorage(userId: string): Unsubscribe | undefined {
  if (!db) return undefined;
  const firestore = db;
  const unsubscribes = syncedKeys.map((key) => {
    const reference = doc(collection(firestore, "users", userId, "data"), firestoreKey(key));
    return onSnapshot(reference, (snapshot) => {
      if (snapshot.exists()) {
        localStorage.setItem(scopedStorageKey(key, userId), JSON.stringify(snapshot.data().value || {}));
        window.dispatchEvent(new Event("life-data-updated"));
        return;
      }

      const localValue = readUserStorage(key, userId, {});
      void setDoc(reference, { value: localValue, updatedAt: new Date().toISOString() });
    });
  });

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export function activeUserId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("personal-life-active-user");
}

export function readActiveUserStorage<T>(key: string, fallback: T): T {
  const userId = activeUserId();
  return userId ? readUserStorage(key, userId, fallback) : fallback;
}

export function writeActiveUserStorage<T>(key: string, value: T): void {
  const userId = activeUserId();
  if (userId) writeUserStorage(key, userId, value);
}

export function removeActiveUserStorage(key: string): void {
  const userId = activeUserId();
  if (userId) removeUserStorage(key, userId);
}

export function readUserStorage<T>(key: string, userId: string, fallback: T): T {
  try {
    const value = localStorage.getItem(scopedStorageKey(key, userId));
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeUserStorage<T>(key: string, userId: string, value: T): void {
  localStorage.setItem(scopedStorageKey(key, userId), JSON.stringify(value));
  window.dispatchEvent(new Event("life-data-updated"));
  if (db) {
    const reference = doc(collection(db, "users", userId, "data"), firestoreKey(key));
    void setDoc(reference, { value, updatedAt: new Date().toISOString() });
  }
}

export function removeUserStorage(key: string, userId: string): void {
  localStorage.removeItem(scopedStorageKey(key, userId));
  if (db) {
    const reference = doc(collection(db, "users", userId, "data"), firestoreKey(key));
    void deleteDoc(reference);
  }
}
