/**
 * useAnimatedNumber
 *
 * Smoothly animates a numeric value from its previous state to a new target
 * using requestAnimationFrame and an easeOutExpo curve.
 *
 * @param {number} target   — the value to animate toward
 * @param {number} duration — animation duration in ms (default 400)
 * @returns {number}        — the current animated value
 */
import { useState, useEffect, useRef } from "react";

// easeOutExpo: blazing fast start, long feather-soft tail — numbers feel like they settle
const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export function useAnimatedNumber(target, duration = 500) {
  const [current, setCurrent] = useState(target);
  const fromRef  = useRef(target);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to   = target;

    if (from === to || !Number.isFinite(to)) return;

    cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutExpo(progress);

      setCurrent(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to;
        setCurrent(to);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  // Keep fromRef in sync when target lands without animating
  useEffect(() => {
    fromRef.current = target;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return current;
}
