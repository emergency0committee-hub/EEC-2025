// src/hooks/useCountdown.js
import { useState, useEffect, useRef } from "react";

export default function useCountdown(initial) {
  const [remaining, setRemaining] = useState(initial);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  const start = () => {
    if (timerRef.current) return;
    setActive(true);
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setActive(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const reset = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setRemaining(initial);
    setActive(false);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { remaining, start, reset, active, fmt };
}
