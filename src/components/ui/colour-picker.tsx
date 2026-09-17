"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Colours travel as #rrggbb, but a saturation/value pane has to think in HSV.

interface Hsv {
  /** 0-360 */
  h: number;
  /** 0-1 */
  s: number;
  /** 0-1 */
  v: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = isHex(hex) ? hex.slice(1) : "000000";
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Drag anywhere in an element and get back where the pointer is, 0-1 on each
 * axis. Pointer capture keeps the drag alive outside the element, so there is no
 * need for window listeners that have to be torn down.
 */
function dragHandlers(onMove: (x: number, y: number) => void) {
  const report = (target: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = target.getBoundingClientRect();
    onMove(clamp01((clientX - rect.left) / rect.width), clamp01((clientY - rect.top) / rect.height));
  };

  return {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      report(event.currentTarget, event.clientX, event.clientY);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      report(event.currentTarget, event.clientX, event.clientY);
    },
  };
}

interface ColourPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** Offered under the picker as one-click choices. */
  presets?: string[];
  className?: string;
}

export function ColourPicker({ value, onChange, presets = [], className }: ColourPickerProps) {
  const hsv = hexToHsv(value);
  // A grey has no hue to read back out of its hex, so the slider remembers where
  // it was left rather than snapping to red every time the colour goes pale.
  const [rememberedHue, setRememberedHue] = useState(hsv.h);
  const hue = hsv.s === 0 ? rememberedHue : hsv.h;

  const emit = (next: Hsv) => {
    setRememberedHue(next.h);
    onChange(hsvToHex(next));
  };

  const pane = dragHandlers((x, y) => emit({ h: hue, s: x, v: 1 - y }));
  const slider = dragHandlers((x) => emit({ h: x * 360, s: hsv.s || 1, v: hsv.v || 1 }));

  const nudge = (event: React.KeyboardEvent, apply: (step: number) => void) => {
    const step = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    apply(event.shiftKey ? step * 10 : step);
  };

  return (
    <div className={cn("w-56 space-y-2", className)}>
      {/* White across, black down, over the chosen hue — the usual saturation/value square. */}
      <div
        onPointerDown={pane.onPointerDown}
        onPointerMove={pane.onPointerMove}
        onKeyDown={(event) =>
          nudge(event, (step) => {
            const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
            emit({
              h: hue,
              s: horizontal ? clamp01(hsv.s + step / 100) : hsv.s,
              v: horizontal ? hsv.v : clamp01(hsv.v + step / 100),
            });
          })
        }
        role="application"
        aria-label="Saturation and brightness"
        tabIndex={0}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-md border focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: hsvToHex({ h: hue, s: 1, v: 1 }) }}
      >
        <div className="absolute inset-0 rounded-md bg-linear-to-r from-white to-transparent" />
        <div className="absolute inset-0 rounded-md bg-linear-to-t from-black to-transparent" />
        <div
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      <div
        onPointerDown={slider.onPointerDown}
        onPointerMove={slider.onPointerMove}
        onKeyDown={(event) => nudge(event, (step) => emit({ h: (hue + step * 2 + 360) % 360, s: hsv.s || 1, v: hsv.v || 1 }))}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        tabIndex={0}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full border focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${(hue / 360) * 100}%`, backgroundColor: hsvToHex({ h: hue, s: 1, v: 1 }) }}
        />
      </div>

      <HexInput value={value} onChange={onChange} />

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              style={{ backgroundColor: preset }}
              aria-label={`Use ${preset}`}
              title={preset}
              className={cn(
                "size-5 rounded-full transition-transform hover:scale-110",
                value.toLowerCase() === preset.toLowerCase() &&
                  "ring-2 ring-ring ring-offset-2 ring-offset-popover"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Kept apart from the colour itself so a half-typed "#1a2" does not reset the pane. */
function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [typed, setTyped] = useState<string | undefined>(undefined);

  return (
    <Input
      value={typed ?? value.toUpperCase()}
      onChange={(event) => {
        const next = event.target.value.startsWith("#")
          ? event.target.value
          : `#${event.target.value}`;
        setTyped(next);
        if (isHex(next)) onChange(next.toLowerCase());
      }}
      onBlur={() => setTyped(undefined)}
      maxLength={7}
      spellCheck={false}
      aria-label="Colour as hex"
      className="h-8 font-mono text-xs uppercase"
    />
  );
}

interface ColourPickerButtonProps extends ColourPickerProps {
  /** Describes which colour is being picked, for screen readers. */
  label?: string;
}

/** A swatch that opens the picker — what sits in a form row. */
export function ColourPickerButton({
  value,
  onChange,
  presets,
  label = "Pick a colour",
  className,
}: ColourPickerButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={value.toUpperCase()}
          style={{ backgroundColor: value }}
          className={cn(
            "size-8 shrink-0 rounded-md border border-input transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            className
          )}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <ColourPicker value={value} onChange={onChange} presets={presets} />
      </PopoverContent>
    </Popover>
  );
}
