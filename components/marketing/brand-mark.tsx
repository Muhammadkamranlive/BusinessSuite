import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl bg-[color:var(--bs-ink)] text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--bs-ink)_28%,transparent)]",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path
          d="M5 7.5C5 6.12 6.12 5 7.5 5H12.2c2.1 0 3.8 1.55 3.8 3.45 0 1.22-.7 2.28-1.78 2.88C15.5 11.95 16.4 13.1 16.4 14.5 16.4 16.54 14.6 18.2 12.3 18.2H7.5C6.12 18.2 5 17.08 5 15.7V7.5Z"
          stroke="white"
          strokeWidth="1.7"
        />
        <path d="M8.2 8.4h3.7c.9 0 1.6.62 1.6 1.38S12.8 11.16 11.9 11.16H8.2V8.4Zm0 4.4h4.1c.98 0 1.75.66 1.75 1.48 0 .82-.77 1.48-1.75 1.48H8.2V12.8Z" fill="white" />
      </svg>
    </span>
  );
}
