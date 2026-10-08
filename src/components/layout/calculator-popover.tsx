"use client";

import { useRef, useState } from "react";
import { Calculator, GripHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { evaluate } from "@/lib/calculator";

const KEYS = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "⌫", "="];
const OPERATORS = new Set(["÷", "×", "−", "+"]);

// Plain digits to carry on calculating with; float noise like 0.30000000000000004 trimmed.
const plain = (value: number) => String(Number(value.toFixed(8)));
const grouped = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 8 });

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

// A pocket calculator on every page, in a small window that floats over it.
// It stays open while you read and click the page underneath, drags by its
// title bar to wherever it is out of the way, and closes only from its ✕ or Esc.
// Type into the box or tap the keys; Enter or = moves the sum into the history
// above and empties the box for the next one. Starting the next sum with an
// operator carries on from the last answer. C wipes the box and the history.
export function CalculatorPopover() {
  // The navbar never unmounts, so the sums and where the window was left
  // survive closing it and moving between pages.
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<{ expression: string; result: number }[]>([]);
  // Null until first dragged: until then it sits under the navbar, at the right.
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const result = evaluate(expression);
  const last = history[history.length - 1];

  const enter = (next: string) =>
    setExpression(
      expression === "" && last && /^[+\-−*/×÷]$/.test(next) ? plain(last.result) + next : next
    );

  const press = (key: string) => {
    if (key === "C") {
      setExpression("");
      setHistory([]);
    } else if (key === "⌫") setExpression(expression.slice(0, -1));
    else if (key === "=") {
      if (result !== undefined) {
        setHistory([...history, { expression, result }]);
        setExpression("");
      }
    } else enter(expression + key);
    inputRef.current?.focus();
  };

  // Dragging by the title bar, kept wholly on screen.
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || !windowRef.current) return;
    const rect = windowRef.current.getBoundingClientRect();
    grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!grab.current || !windowRef.current) return;
    const { width, height } = windowRef.current.getBoundingClientRect();
    setPosition({
      x: clamp(e.clientX - grab.current.dx, 0, window.innerWidth - width),
      y: clamp(e.clientY - grab.current.dy, 0, window.innerHeight - height),
    });
  };
  const endDrag = () => {
    grab.current = null;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title="Calculator"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(open && "bg-accent text-accent-foreground")}
      >
        <Calculator className="size-4" />
        <span className="sr-only sm:not-sr-only">Calculator</span>
      </Button>

      {open && (
        <div
          ref={windowRef}
          role="dialog"
          aria-label="Calculator"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          style={position ? { left: position.x, top: position.y } : { right: 16, top: 64 }}
          className="fixed z-50 flex w-64 flex-col gap-2.5 overflow-hidden rounded-xl bg-popover pb-2.5 text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
        >
          <div
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            title="Drag to move"
            className="flex cursor-move touch-none items-center gap-2 border-b bg-muted/50 px-2.5 py-1.5 select-none"
          >
            <GripHorizontal className="size-4 text-muted-foreground" />
            <p className="flex-1 text-sm font-medium">Calculator</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Close"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close calculator</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5 px-2.5">
            {history.length > 0 && (
              // Reversed in a reversed column: oldest at the top, and the scroll
              // starts at the newest line instead of the oldest.
              <ul className="flex max-h-32 flex-col-reverse overflow-y-auto text-right text-sm text-muted-foreground tabular-nums">
                {[...history].reverse().map((line, index) => (
                  <li key={history.length - index} className="py-0.5">
                    {line.expression} ={" "}
                    <span className="font-medium text-foreground">{grouped(line.result)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Input
              ref={inputRef}
              autoFocus
              value={expression}
              onChange={(e) => enter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && press("=")}
              placeholder="0"
              inputMode="decimal"
              aria-label="Calculation"
              className="h-10 text-right text-lg tabular-nums"
            />
            <p className="h-5 text-right text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {result !== undefined && plain(result) !== expression && `= ${grouped(result)}`}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {KEYS.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant={key === "=" ? "default" : OPERATORS.has(key) ? "secondary" : "outline"}
                  onClick={() => press(key)}
                  aria-label={key === "⌫" ? "Backspace" : key === "C" ? "Clear all and history" : undefined}
                >
                  {key}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
