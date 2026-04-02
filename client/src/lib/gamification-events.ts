// client/src/lib/gamification-events.ts
// Lightweight pub/sub for gamification feedback (HUD animations, cross-component signals)

export type GamificationEventName = "xp_gained" | "level_up" | "achievement_unlocked";

type Listener = (detail?: unknown) => void;

const listeners = new Map<GamificationEventName, Set<Listener>>();

/**
 * Subscribe to gamification events. Returns an unsubscribe function.
 */
export function subscribeGamificationEvent(
  name: GamificationEventName,
  fn: Listener
): () => void {
  if (!listeners.has(name)) {
    listeners.set(name, new Set());
  }
  listeners.get(name)!.add(fn);
  return () => {
    listeners.get(name)?.delete(fn);
  };
}

/**
 * Emit a gamification event (e.g. after scan XP or achievement toast).
 */
export function emitGamificationEvent(name: GamificationEventName, detail?: unknown): void {
  const set = listeners.get(name);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try {
      fn(detail);
    } catch (e) {
      console.error("[gamification-events]", name, e);
    }
  }
}
