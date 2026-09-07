import { cn } from "@/lib/utils";

// The TULSI brand mark — a tulsi leaf pair on the navy tile.
// Kept in sync with `src/app/icon.svg`, which Next.js serves as the favicon.
// Inlined rather than loaded as an image so it costs no request and never flashes;
// the tile carries its own colours, so it reads the same in light and dark.
export function TulsiLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="TULSI"
    >
      <rect width="32" height="32" rx="7" fill="#2c3a75" />
      <path
        transform="translate(4 3)"
        fill="#f6f0e2"
        d="M12 21c0-6.5 2.5-11 7-13-1 6-2.5 11-7 13Zm0 0c0-6.5-2.5-11-7-13 1 6 2.5 11 7 13Z"
      />
      <path
        transform="translate(4 3)"
        d="M12 21V9"
        stroke="#f6f0e2"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
