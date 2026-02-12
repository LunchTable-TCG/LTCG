import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "admin-favorites";
const EVENT_NAME = "favorites-changed";

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot() {
  return "[]";
}

function subscribe(callback: () => void) {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}

function setFavorites(favorites: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // localStorage unavailable
  }
}

export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const favorites: string[] = JSON.parse(raw);

  const toggleFavorite = useCallback((href: string) => {
    const current: string[] = JSON.parse(getSnapshot());
    if (current.includes(href)) {
      setFavorites(current.filter((f) => f !== href));
    } else {
      setFavorites([...current, href]);
    }
  }, []);

  const isFavorite = useCallback((href: string) => favorites.includes(href), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
