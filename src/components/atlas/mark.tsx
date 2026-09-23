import { cn } from "@/lib/utils";

export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("text-foreground", className)}
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M16 3v6M16 23v6M3 16h6M23 16h6M7.2 7.2l4.2 4.2M20.6 20.6l4.2 4.2M24.8 7.2l-4.2 4.2M11.4 20.6l-4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AtlasWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <AtlasMark className="size-6" />
      <span className="font-display text-lg font-semibold tracking-[-0.04em]">
        ATLAS
      </span>
    </span>
  );
}
