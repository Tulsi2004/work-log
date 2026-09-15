"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/work-reports/autocomplete-input";
import { useSuggestions } from "@/hooks/use-suggestions";
import { cn } from "@/lib/utils";
import { SPEND_CATEGORIES, SPEND_CATEGORY_META, isKeptCategory, sumMoney } from "@/lib/money";
import { formatMoney } from "@/utils/format";
import type { SalaryEntryInput } from "@/lib/validations/salary-entry";

// What the last row used is almost always what the next one uses.
const DEFAULT_CATEGORY = "OTHER" as const;

export function SpendListFields() {
  const form = useFormContext<SalaryEntryInput>();
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "spends" });
  const spends = useWatch({ control: form.control, name: "spends" }) ?? [];
  // Rent, the phone bill, the monthly SIP — the same spends come round again.
  const { data: whatSuggestions = [], isLoading: isLoadingWhat } = useSuggestions(
    "/api/salary-entries/suggestions?type=spend"
  );

  // The row being dragged, and the one row allowed to start a drag — only the
  // grip arms it, so text stays selectable inside the inputs.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);

  const endDrag = () => {
    setDragIndex(null);
    setArmedIndex(null);
  };

  // Rows are only half-typed here, so the totals are summed off the raw strings
  // rather than through the parsed helpers.
  const amountOf = (spend: { amount?: string }) => Number(spend?.amount) || 0;
  const spent = sumMoney(spends.filter((s) => !isKeptCategory(s?.category)).map(amountOf));
  const saved = sumMoney(spends.filter((s) => isKeptCategory(s?.category)).map(amountOf));

  const addSpend = () => {
    append({ what: "", amount: "", category: spends[spends.length - 1]?.category ?? DEFAULT_CATEGORY });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>What you did with it</Label>
        {spends.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Spent {formatMoney(spent)}
            {saved > 0 && ` · Saved ${formatMoney(saved)}`}
          </p>
        )}
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nothing added yet — break the money down into what it went on, or leave it empty and come back
          later.
        </p>
      )}

      {fields.map((item, index) => (
        <div
          key={item.id}
          draggable={armedIndex === index}
          onDragStart={(event) => {
            setDragIndex(index);
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (dragIndex === null || dragIndex === index) return;
            // Reorder as the pointer passes each row, so the list previews the drop.
            move(dragIndex, index);
            setDragIndex(index);
          }}
          onDragEnd={endDrag}
          onDrop={endDrag}
          className={cn(
            "flex items-start gap-1.5 rounded-md transition-opacity",
            dragIndex === index && "opacity-40"
          )}
        >
          <button
            type="button"
            aria-label={`Drag spend ${index + 1} to reorder`}
            // Arming on press keeps the draggable attribute off the row until
            // the grip is actually grabbed.
            onPointerDown={() => setArmedIndex(index)}
            onPointerUp={() => setArmedIndex(null)}
            className="mt-1.5 cursor-grab rounded-sm p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>

          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <FormField
              control={form.control}
              name={`spends.${index}.what`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <AutocompleteInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="e.g. Rent"
                      suggestions={whatSuggestions}
                      isLoadingSuggestions={isLoadingWhat}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`spends.${index}.amount`}
              render={({ field }) => (
                <FormItem className="sm:w-28">
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="Amount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`spends.${index}.category`}
              render={({ field }) => (
                <FormItem className="sm:w-40">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPEND_CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <span className={cn("size-2.5 rounded-full", SPEND_CATEGORY_META[value].dot)} />
                            {SPEND_CATEGORY_META[value].name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-0.5 flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
            >
              <ChevronUp className="size-4" />
              <span className="sr-only">Move spend up</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => move(index, index + 1)}
              disabled={index === fields.length - 1}
            >
              <ChevronDown className="size-4" />
              <span className="sr-only">Move spend down</span>
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
              <Trash2 className="size-4" />
              <span className="sr-only">Remove spend</span>
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addSpend}>
        <Plus className="size-4" />
        Add spend
      </Button>
    </div>
  );
}
