"use client";

import { create } from "zustand";
import { KeystrokeEvent, TypingSession, SessionStats, computeStats } from "@/lib/keystroke";
import type { PassageCategory, PassageLength } from "@/app/api/passage/route";

type SessionStatus = "idle" | "active" | "finished";

interface TypingState {
  passage: string;
  cursorIndex: number;
  keystrokes: KeystrokeEvent[];
  errorCount: number;
  startTime: number | null;
  status: SessionStatus;
  stats: SessionStats | null;
  // Config
  category: PassageCategory;
  length: PassageLength;
  // Pre-fetched next passage
  nextPassage: string | null;
  loadingNext: boolean;

  // Actions
  recordKeystroke: (key: string) => void;
  resetSession: () => void;
  setCategory: (category: PassageCategory) => void;
  setLength: (length: PassageLength) => void;
  getStats: () => SessionStats | null;
}

async function fetchPassage(category: PassageCategory, length: PassageLength): Promise<string> {
  const res = await fetch(`/api/passage?category=${category}&length=${length}`);
  if (!res.ok) throw new Error("Failed to fetch passage");
  const data = await res.json();
  return data.text;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  passage: "",
  cursorIndex: 0,
  keystrokes: [],
  errorCount: 0,
  startTime: null,
  status: "idle",
  stats: null,
  category: "prose",
  length: "medium",
  nextPassage: null,
  loadingNext: false,

  recordKeystroke(key: string) {
    const state = get();
    if (state.status === "finished") return;

    const now = Date.now();
    const isFirst = state.keystrokes.length === 0 && state.errorCount === 0;
    const startTime = isFirst ? now : (state.startTime ?? now);

    const expected = state.passage[state.cursorIndex] ?? "";
    const correct = key === expected;

    if (!correct) {
      set({ errorCount: state.errorCount + 1, startTime });
      return;
    }

    const latency = isFirst ? 0 : now - (state.startTime ?? now);
    const event: KeystrokeEvent = { key, expected, correct: true, timestamp: now, latency };

    const newKeystrokes = [...state.keystrokes, event];
    const newIndex = state.cursorIndex + 1;
    const finished = newIndex >= state.passage.length;

    if (finished) {
      const session: TypingSession = {
        passage: state.passage,
        keystrokes: newKeystrokes,
        startTime,
        endTime: now,
      };
      const stats = computeStats(session);
      set({
        keystrokes: newKeystrokes,
        cursorIndex: newIndex,
        startTime,
        status: "finished",
        stats: { ...stats, errors: state.errorCount + stats.errors },
      });
      // Start pre-fetching next passage in background
      get()._prefetchNext();
    } else {
      set({ keystrokes: newKeystrokes, cursorIndex: newIndex, startTime, status: "active" });
    }
  },

  async resetSession() {
    const state = get();
    if (state.nextPassage) {
      // Pre-fetched passage is ready — use it immediately and fetch the next one
      set({
        passage: state.nextPassage,
        cursorIndex: 0,
        keystrokes: [],
        errorCount: 0,
        startTime: null,
        status: "idle",
        stats: null,
        nextPassage: null,
      });
      get()._prefetchNext();
    } else {
      // Nothing pre-fetched — show loading state and fetch now
      set({ passage: "", cursorIndex: 0, keystrokes: [], errorCount: 0, startTime: null, status: "idle", stats: null, loadingNext: true });
      try {
        const text = await fetchPassage(get().category, get().length);
        set({ passage: text, loadingNext: false });
        get()._prefetchNext();
      } catch {
        set({ loadingNext: false });
      }
    }
  },

  setCategory(category: PassageCategory) {
    set({ category, nextPassage: null });
    get().resetSession();
  },

  setLength(length: PassageLength) {
    set({ length, nextPassage: null });
    get().resetSession();
  },

  getStats() {
    return get().stats;
  },

  // Internal — pre-fetches next passage in background
  async _prefetchNext() {
    const { category, length, loadingNext } = get();
    if (loadingNext) return;
    set({ loadingNext: true });
    try {
      const text = await fetchPassage(category, length);
      set({ nextPassage: text, loadingNext: false });
    } catch {
      set({ loadingNext: false });
    }
  },
} as TypingState & { _prefetchNext: () => Promise<void> }));
