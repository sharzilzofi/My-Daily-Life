export function scopedStorageKey(key: string, userId: string): string {
  return `${key}:${userId}`;
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
}

export function removeUserStorage(key: string, userId: string): void {
  localStorage.removeItem(scopedStorageKey(key, userId));
}
