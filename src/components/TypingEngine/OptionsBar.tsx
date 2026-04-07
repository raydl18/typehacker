"use client";

import type { PassageCategory, PassageLength } from "@/app/api/passage/route";

const CATEGORIES: { value: PassageCategory; label: string }[] = [
  { value: "news", label: "news" },
  { value: "learn", label: "learn" },
  { value: "code", label: "code" },
];

const LENGTHS: { value: PassageLength; label: string }[] = [
  { value: "short", label: "short" },
  { value: "medium", label: "medium" },
  { value: "long", label: "long" },
];

interface Props {
  category: PassageCategory;
  length: PassageLength;
  loadingNext: boolean;
  onCategory: (c: PassageCategory) => void;
  onLength: (l: PassageLength) => void;
}

export default function OptionsBar({ category, length, loadingNext, onCategory, onLength }: Props) {
  return (
    <div className="flex items-center gap-6 font-mono text-sm">
      <div className="flex items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => onCategory(c.value)}
            className={`px-3 py-1 rounded transition-colors ${
              category === c.value
                ? "text-green-400 bg-gray-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-700" />

      <div className="flex items-center gap-2">
        {LENGTHS.map((l) => (
          <button
            key={l.value}
            onClick={() => onLength(l.value)}
            className={`px-3 py-1 rounded transition-colors ${
              length === l.value
                ? "text-green-400 bg-gray-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {loadingNext && (
        <span className="text-gray-600 text-xs ml-auto">fetching next...</span>
      )}
    </div>
  );
}
