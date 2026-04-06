"use client";

interface Props {
  passage: string;
  cursorIndex: number;
  keystrokes: { correct: boolean }[];
}

export default function PassageDisplay({ passage, cursorIndex, keystrokes }: Props) {
  if (!passage) return null;

  return (
    <div className="font-mono text-xl leading-relaxed tracking-wide select-none">
      {passage.split("").map((char, i) => {
        let className = "text-gray-400"; // not yet reached
        if (i < cursorIndex) {
          className = "text-green-400";
        } else if (i === cursorIndex) {
          className = "text-white underline decoration-2 underline-offset-4";
        }
        return (
          <span key={i} className={className}>
            {char}
          </span>
        );
      })}
    </div>
  );
}
