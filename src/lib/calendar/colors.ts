export const EVENT_COLORS = [
  { name: "Tomato", hex: "#d50000" },
  { name: "Flamingo", hex: "#e67c73" },
  { name: "Tangerine", hex: "#f4511e" },
  { name: "Banana", hex: "#f6bf26" },
  { name: "Sage", hex: "#33b679" },
  { name: "Basil", hex: "#0b8043" },
  { name: "Peacock", hex: "#039be5" },
  { name: "Blueberry", hex: "#3f51b5" },
  { name: "Lavender", hex: "#7986cb" },
  { name: "Grape", hex: "#8e24aa" },
  { name: "Graphite", hex: "#616161" },
] as const;

/** Calendar swatch grid: the 11 event colours plus Cobalt (Google's tasks blue). */
export const CALENDAR_COLORS = [...EVENT_COLORS, { name: "Cobalt", hex: "#4285f4" }] as const;

export const colorName = (hex: string) =>
  CALENDAR_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White text on dark colours, Google's #3c4043 on light ones (e.g. Banana). */
export const textColorFor = (bg: string) => (luminance(bg) > 0.5 ? "#3c4043" : "#ffffff");
