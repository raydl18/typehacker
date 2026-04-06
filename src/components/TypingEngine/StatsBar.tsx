"use client";

import { SessionStats } from "@/lib/keystroke";

interface Props {
  stats: SessionStats;
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="flex gap-8 text-sm font-mono">
      <div>
        <span className="text-gray-400">WPM </span>
        <span className="text-white font-bold text-lg">{stats.wpm}</span>
      </div>
      <div>
        <span className="text-gray-400">ACC </span>
        <span className="text-white font-bold text-lg">{stats.accuracy}%</span>
      </div>
      <div>
        <span className="text-gray-400">TIME </span>
        <span className="text-white font-bold text-lg">{stats.duration}s</span>
      </div>
      <div>
        <span className="text-gray-400">ERR </span>
        <span className="text-red-400 font-bold text-lg">{stats.errors}</span>
      </div>
    </div>
  );
}
