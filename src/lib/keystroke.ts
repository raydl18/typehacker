// Every key press the user makes during a session is recorded as a KeystrokeEvent.
// This is the raw data that analytics.ts will process.
export interface KeystrokeEvent {
  key: string;          // The character typed (e.g. "a", "b", " ")
  expected: string;     // The character that was supposed to be typed
  correct: boolean;     // Whether key === expected
  timestamp: number;    // ms since epoch (Date.now())
  latency: number;      // ms since the previous keystroke (0 for first keystroke)
}

// A TypingSession holds everything about one run through a passage.
export interface TypingSession {
  passage: string;
  keystrokes: KeystrokeEvent[];
  startTime: number;    // timestamp of first keystroke
  endTime: number;      // timestamp of last keystroke
}

// Summary statistics computed from a completed session.
export interface SessionStats {
  wpm: number;          // words per minute
  accuracy: number;     // 0–100
  duration: number;     // seconds
  totalKeystrokes: number;
  errors: number;
}

// Compute summary stats from a completed session.
// Called once when the session ends.
export function computeStats(session: TypingSession): SessionStats {
  const { keystrokes, startTime, endTime } = session;
  const duration = (endTime - startTime) / 1000; // seconds
  const errors = keystrokes.filter((k) => !k.correct).length;
  const accuracy = keystrokes.length > 0
    ? ((keystrokes.length - errors) / keystrokes.length) * 100
    : 0;
  // Standard WPM: characters typed / 5 / minutes elapsed
  const minutes = duration / 60;
  const wpm = minutes > 0 ? Math.round(keystrokes.length / 5 / minutes) : 0;

  return {
    wpm,
    accuracy: Math.round(accuracy * 10) / 10,
    duration: Math.round(duration * 10) / 10,
    totalKeystrokes: keystrokes.length,
    errors,
  };
}
