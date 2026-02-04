import { useEffect, useSyncExternalStore } from "react";

/**
 * Detects user's reduced motion preference.
 * Uses useSyncExternalStore for hydration-safe SSR compatibility.
 */
function getReducedMotionPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToReducedMotion(callback: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

// Server snapshot always returns false (no way to know preference)
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook to detect reduced motion preference.
 *
 * @param override - Set to `true` to force reduced motion, `false` to force full motion,
 *                   or `undefined` to respect user preference (default)
 */
export function useReducedMotion(override?: boolean): boolean {
  const systemPreference = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    getServerSnapshot
  );

  // Allow explicit override for debugging or specific UX needs
  if (override !== undefined) {
    return override;
  }

  return systemPreference;
}

/**
 * Development helper: logs current reduced motion state
 */
export function useReducedMotionDebug(): { preference: boolean; source: string } {
  const preference = useReducedMotion();

  useEffect(() => {
    const source = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "OS setting (reduce motion ENABLED)"
      : "OS setting (animations allowed)";

    console.log(`[useReducedMotion] ${source} → prefersReducedMotion=${preference}`);
  }, [preference]);

  return {
    preference,
    source: preference ? "OS: reduced motion ON" : "OS: animations allowed",
  };
}
