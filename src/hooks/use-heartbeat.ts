import { useEffect } from "react";
import { heartbeat } from "@/lib/atlas/api";

export function useHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const beat = () => {
      if (cancelled) return;
      void heartbeat().catch(() => undefined);
    };
    beat();
    const id = window.setInterval(beat, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);
}
