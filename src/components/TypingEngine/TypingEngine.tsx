"use client";

import { useEffect } from "react";
import { useTypingStore } from "@/stores/typingStore";
import PassageDisplay from "./PassageDisplay";
import StatsBar from "./StatsBar";
import OptionsBar from "./OptionsBar";

export default function TypingEngine() {
  const {
    passage, cursorIndex, keystrokes, errorPositions, status, stats,
    category, length, loadingNext,
    recordKeystroke, resetSession, setCategory, setLength,
  } = useTypingStore();

  // Randomize the passage on the client after hydration.
  // Can't do this in the store initializer — that runs on the server too,
  // and server + client would pick different passages → hydration mismatch.
  useEffect(() => {
    resetSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Escape") {
        resetSession();
        return;
      }

      if (e.key.length !== 1) return;

      e.preventDefault();
      recordKeystroke(e.key);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recordKeystroke, resetSession]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-white mb-12 tracking-tight">
        type<span className="text-green-400">hacker</span>
      </h1>

      <div className="w-full max-w-3xl space-y-6">
        <OptionsBar
          category={category}
          length={length}
          loadingNext={loadingNext}
          onCategory={setCategory}
          onLength={setLength}
        />

        <PassageDisplay
          passage={passage}
          cursorIndex={cursorIndex}
          keystrokes={keystrokes}
          errorPositions={errorPositions}
        />

        {status === "finished" && stats && (
          <div className="space-y-4">
            <StatsBar stats={stats} />
            <p className="text-gray-500 text-sm font-mono">
              press <kbd className="text-white">Esc</kbd> to try again
            </p>
          </div>
        )}

        {status === "idle" && !passage && (
          <p className="text-gray-600 text-sm font-mono">loading passage...</p>
        )}

        {status === "idle" && passage && (
          <p className="text-gray-600 text-sm font-mono">start typing to begin</p>
        )}
      </div>
    </div>
  );
}
