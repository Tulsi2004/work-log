"use client";

import { useRef, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { evaluate } from "@/lib/calculator";

const KEYS = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "⌫", "="];
const OPERATORS = new Set(["÷", "×", "−", "+"]);

// Plain digits to carry on calculating with; float noise like 0.30000000000000004 trimmed.
const plain = (value: number) => String(Number(value.toFixed(8)));
const grouped = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 8 });

// A pocket calculator on every page. Type into the box or tap the keys; Enter or
// = moves the sum into the history above and empties the box for the next one.
// Starting the next sum with an operator carries on from the last answer. C
// wipes the box and the history together.
export function CalculatorPopover() {
  // Lives outside the popover, so closing it keeps the sums.
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<{ expression: string; result: number }[]>([]);
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" title="Calculator">
          <Calculator className="size-4" />
          <span className="sr-only sm:not-sr-only">Calculator</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-medium">Calculator</p>
        {history.length > 0 && (
          // Reversed in a reversed column: oldest at the top, and the scroll
          // starts at the newest line instead of the oldest.
          <ul className="flex max-h-32 flex-col-reverse overflow-y-auto text-right text-sm text-muted-foreground tabular-nums">
            {[...history].reverse().map((line, index) => (
              <li key={history.length - index} className="py-0.5">
                {line.expression} = <span className="font-medium text-foreground">{grouped(line.result)}</span>
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
          {result !== undefined &&
            plain(result) !== expression &&
            `= ${grouped(result)}`}
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
      </PopoverContent>
    </Popover>
  );
}
