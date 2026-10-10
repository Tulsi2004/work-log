"use client";

import { useEffect, useRef } from "react";
import { Printer } from "lucide-react";

// The report is opened to be printed, so the print dialog comes up on its own
// once — and the button stays for printing again after it is dismissed.
export function PrintButton() {
  const printed = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in development; the ref keeps it to one dialog.
    if (printed.current) return;
    printed.current = true;
    // Wait for the web font, or the PDF can come out in the fallback face.
    document.fonts.ready.then(() => window.print());
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 print:hidden"
    >
      <Printer className="size-4" />
      Print / Save as PDF
    </button>
  );
}
