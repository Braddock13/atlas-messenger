import { isRecentlyOnline } from "@/lib/atlas/time";
import { cn } from "@/lib/utils";

export function PresenceDot({
  isOnline,
  lastSeen,
  className,
}: {
  isOnline: boolean;
  lastSeen: string | null;
  className?: string;
}) {
  const on = isOnline || isRecentlyOnline(lastSeen);
  return (
    <span
      className={cn(
        "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card",
        on ? "bg-ok" : "bg-muted-foreground/50",
        className,
      )}
      aria-label={on ? "En ligne" : "Hors ligne"}
    />
  );
}
