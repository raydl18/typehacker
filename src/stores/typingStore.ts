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
  // Indices of characters that had at least one wrong keypress
  errorPositions: number[];
  startTime: number | null;
  status: SessionStatus;
  stats: SessionStats | null;
  category: PassageCategory;
  length: PassageLength;
  nextPassage: string | null;
  loadingNext: boolean;

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

// Tracks the most recent fetch so stale responses are ignored
let currentFetchId = 0;

function prefetchNext(
  set: (partial: Partial<TypingState>) => void,
  get: () => TypingState
) {
  const { category, length, loadingNext } = get();
  if (loadingNext) return;
  set({ loadingNext: true });
  fetchPassage(category, length)
    .then((text) => set({ nextPassage: text, loadingNext: false }))
    .catch(() => set({ loadingNext: false }));
}

function loadPassage(
  set: (partial: Partial<TypingState>) => void,
  get: () => TypingState
) {
  const fetchId = ++currentFetchId;
  set({ passage: "", loadingNext: true });
  const { category, length } = get();
  fetchPassage(category, length)
    .then((text) => {
      if (fetchId !== currentFetchId) return; // a newer fetch superseded this one
      set({ passage: text, loadingNext: false });
      prefetchNext(set, get);
    })
    .catch(() => {
      if (fetchId === currentFetchId) set({ loadingNext: false });
    });
}

const EMPTY_STATE = {
  cursorIndex: 0,
  keystrokes: [] as KeystrokeEvent[],
  errorCount: 0,
  errorPositions: [] as number[],
  startTime: null,
  status: "idle" as SessionStatus,
  stats: null,
  nextPassage: null,
};

export const useTypingStore = create<TypingState>((set, get) => ({
  passage: "",
  ...EMPTY_STATE,
  category: "learn",
  length: "medium",
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
      const errorPositions = state.errorPositions.includes(state.cursorIndex)
        ? state.errorPositions
        : [...state.errorPositions, state.cursorIndex];
      set({ errorCount: state.errorCount + 1, startTime, errorPositions });
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
      const totalErrors = state.errorCount;
      const totalCorrect = newKeystrokes.length;
      const accuracy = Math.round((totalCorrect / (totalCorrect + totalErrors)) * 1000) / 10;
      set({
        keystrokes: newKeystrokes,
        cursorIndex: newIndex,
        startTime,
        status: "finished",
        stats: { ...stats, errors: totalErrors, accuracy },
      });
      prefetchNext(set, get);
    } else {
      set({ keystrokes: newKeystrokes, cursorIndex: newIndex, startTime, status: "active" });
    }
  },

  resetSession() {
    const { nextPassage } = get();
    if (nextPassage) {
      set({ passage: nextPassage, ...EMPTY_STATE });
      prefetchNext(set, get);
    } else {
      set(EMPTY_STATE);
      loadPassage(set, get);
    }
  },

  setCategory(category: PassageCategory) {
    set({ category, ...EMPTY_STATE });
    loadPassage(set, get);
  },

  setLength(length: PassageLength) {
    set({ length, ...EMPTY_STATE });
    loadPassage(set, get);
  },

  getStats() {
    return get().stats;
  },
}));
