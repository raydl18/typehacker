export interface Passage {
  id: string;
  text: string;
  category: "prose" | "code" | "quotes";
}

const passages: Passage[] = [
  {
    id: "p1",
    category: "prose",
    text: "The quick brown fox jumps over the lazy dog near the riverbank.",
  },
  {
    id: "p2",
    category: "prose",
    text: "Typing speed improves with deliberate practice and consistent focus on accuracy before velocity.",
  },
  {
    id: "p3",
    category: "quotes",
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
  },
  {
    id: "p4",
    category: "code",
    text: "const greet = (name: string) => `Hello, ${name}!`;",
  },
];

export function getRandomPassage(): Passage {
  return passages[Math.floor(Math.random() * passages.length)];
}
