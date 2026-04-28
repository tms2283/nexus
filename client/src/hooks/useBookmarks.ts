import { useState, useCallback, useEffect } from "react";

export interface Bookmark {
  id: string;
  topic: string;
  context?: string;
  source?: string;
  type: "topic" | "question";
  createdAt: number;
}

const STORAGE_KEY = "nexus_bookmarks";

function load(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(bookmarks: Bookmark[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(load);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setBookmarks(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((bm: Omit<Bookmark, "id" | "createdAt">) => {
    setBookmarks(prev => {
      if (prev.some(b => b.topic === bm.topic)) return prev;
      const next = [{ ...bm, id: crypto.randomUUID(), createdAt: Date.now() }, ...prev];
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      save(next);
      return next;
    });
  }, []);

  const has = useCallback((topic: string) => {
    return bookmarks.some(b => b.topic === topic);
  }, [bookmarks]);

  const clear = useCallback(() => {
    save([]);
    setBookmarks([]);
  }, []);

  return { bookmarks, add, remove, has, clear };
}
