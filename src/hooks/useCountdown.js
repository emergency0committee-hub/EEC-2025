import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export default function useCountdown(secondsInitial) {
  const initialRef = useRef(secondsInitial);
  const [remaining, setRemaining] = useState(secondsInitial);
  const [running, setRunning] = useState(false);

  // If the initial seconds changes (e.g., admin changes timer minutes), reset baseline
  useEffect(() => {
    initialRef.current = secondsInitial;
    setRemaining(secondsInitial);
  }, [secondsInitial]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, remaining]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const reset = useCallback((sec = initialRef.current) => {
    setRemaining(sec);
  }, []);

  const fmt = useCallback((sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return { remaining, running, start, stop, reset, fmt };
}
