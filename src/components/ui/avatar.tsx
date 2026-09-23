import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initial = (name.trim().charAt(0) || "A").toUpperCase();
  const dim =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : size === "xl"
          ? "h-20 w-20 text-2xl"
          : "h-10 w-10 text-sm";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("rounded-full object-cover bg-secondary", dim, className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-secondary font-display font-semibold text-foreground",
        dim,
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
