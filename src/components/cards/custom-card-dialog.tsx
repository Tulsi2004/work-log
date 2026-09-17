"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRefresh } from "@/hooks/use-refresh";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useEmployments } from "@/hooks/use-employments";
import { usePlanLabelLooks } from "@/hooks/use-plan-labels";
import { employmentLabel } from "@/utils/format";
import {
  CARD_MEASURES,
  CARD_MEASURE_LABELS,
  CARD_PERIODS,
  CARD_PERIOD_LABELS,
  CARD_SOURCES,
  CARD_SOURCE_LABELS,
  FILTER_FIELDS,
  MEASURE_FIELDS,
  SOURCE_ENTITY,
  measureNeedsField,
  type CardFilter,
  type CardMeasure,
  type CardPeriod,
  type CardSource,
  type CustomCardValue,
  type FilterOption,
} from "@/lib/custom-cards";
import { createCustomCard, updateCustomCard } from "@/actions/custom-card-actions";
import type { CustomCardInput } from "@/lib/validations/custom-card";

interface CustomCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omitted when building a new one. */
  card?: CustomCardValue;
  onSaved?: (id: string) => void;
}

function toDraft(card?: CustomCardValue): CustomCardInput {
  return {
    title: card?.title ?? "",
    source: card?.source ?? "workReport",
    measure: card?.measure ?? "count",
    field: card?.field ?? "",
    period: card?.period ?? "ALL",
    filters: card?.filters ?? [],
  };
}

export function CustomCardDialog({ open, onOpenChange, card, onSaved }: CustomCardDialogProps) {
  // Radix unmounts dialog content on close, so a key on the body is enough to
  // start each open from the card being edited.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <Body card={card} onOpenChange={onOpenChange} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function Body({ card, onOpenChange, onSaved }: Omit<CustomCardDialogProps, "open">) {
  const refresh = useRefresh();
  const [draft, setDraft] = useState<CustomCardInput>(() => toDraft(card));

  const source = draft.source as CardSource;
  const { data: employments } = useEmployments();
  const { data: customFields = [] } = useCustomFields(SOURCE_ENTITY[source]);
  const planLabels = usePlanLabelLooks();

  // A NUMBER field the user added is measurable in the same way a built-in is.
  const numberFields = customFields.filter((field) => field.type === "NUMBER");
  const measureChoices = [
    ...MEASURE_FIELDS[source].map((entry) => ({ key: entry.key, label: entry.label })),
    ...numberFields.map((field) => ({ key: field.id, label: field.name })),
  ];

  // Anything with a fixed set of answers can be filtered on; free text cannot.
  const filterChoices = [
    ...FILTER_FIELDS[source].map((entry) => ({ key: entry.key, label: entry.label })),
    ...customFields
      .filter((field) => field.type === "SELECT" || field.type === "CHECKBOX")
      .map((field) => ({ key: field.id, label: field.name })),
  ];

  const optionsFor = (fieldKey: string): FilterOption[] => {
    const builtIn = FILTER_FIELDS[source].find((entry) => entry.key === fieldKey);
    if (builtIn?.kind === "company") {
      return (employments ?? []).map((e) => ({ value: e.id, label: employmentLabel(e) }));
    }
    if (builtIn?.kind === "planLabel") {
      return planLabels.map((look) => ({ value: look.id, label: look.name }));
    }
    if (builtIn?.options) return builtIn.options;

    const field = customFields.find((entry) => entry.id === fieldKey);
    if (field?.type === "CHECKBOX") {
      return [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ];
    }
    const options = Array.isArray(field?.options) ? (field.options as unknown[]) : [];
    return options
      .filter((option): option is string => typeof option === "string")
      .map((option) => ({ value: option, label: option }));
  };

  const set = (patch: Partial<CustomCardInput>) => setDraft((current) => ({ ...current, ...patch }));

  // Switching source invalidates whatever was chosen from the old one's lists.
  const changeSource = (next: CardSource) =>
    setDraft((current) => ({ ...current, source: next, field: "", filters: [] }));

  const setFilter = (index: number, patch: Partial<CardFilter>) =>
    setDraft((current) => ({
      ...current,
      filters: current.filters.map((filter, i) => (i === index ? { ...filter, ...patch } : filter)),
    }));

  const needsField = measureNeedsField(draft.measure as CardMeasure);
  const unusedFilter = filterChoices.find(
    (choice) => !draft.filters.some((filter) => filter.field === choice.key)
  );
  const incomplete =
    !draft.title.trim() ||
    (needsField && !draft.field) ||
    draft.filters.some((filter) => !filter.field || !filter.value);

  const mutation = useMutation({
    mutationFn: () => (card ? updateCustomCard(card.id, draft) : createCustomCard(draft)),
    onSuccess: (result) => {
      toast.success(card ? "Card updated" : "Card added");
      refresh("customCard");
      onSaved?.(result.id);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the card"),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{card ? "Edit card" : "Build a card"}</DialogTitle>
        <DialogDescription>
          Pick what to count and how to measure it. The number updates itself as you add records.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="card-title">Title</Label>
          <Input
            id="card-title"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Office days this month"
            maxLength={40}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={draft.source} onValueChange={(v) => changeSource(v as CardSource)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_SOURCES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CARD_SOURCE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={draft.period} onValueChange={(v) => set({ period: v as CardPeriod })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_PERIODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CARD_PERIOD_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Measure</Label>
          <div className="flex gap-2">
            <Select
              value={draft.measure}
              onValueChange={(v) =>
                set({ measure: v as CardMeasure, ...(v === "count" ? { field: "" } : {}) })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_MEASURES.map((value) => (
                  <SelectItem
                    key={value}
                    value={value}
                    // Nothing to sum means only a count makes sense here.
                    disabled={measureNeedsField(value) && measureChoices.length === 0}
                  >
                    {CARD_MEASURE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsField && (
              <Select value={draft.field || ""} onValueChange={(v) => set({ field: v })}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a number" />
                </SelectTrigger>
                <SelectContent>
                  {measureChoices.map((choice) => (
                    <SelectItem key={choice.key} value={choice.key}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!needsField && (
              <div className="flex flex-1 items-center text-sm text-muted-foreground">
                {CARD_SOURCE_LABELS[source].toLowerCase()}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Only count records where…</Label>
          {draft.filters.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No conditions — every record counts.
            </p>
          )}
          {draft.filters.map((filter, index) => (
            <div key={index} className="flex gap-2">
              <Select
                value={filter.field}
                onValueChange={(v) => setFilter(index, { field: v, value: "" })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {filterChoices.map((choice) => (
                    <SelectItem key={choice.key} value={choice.key}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filter.value} onValueChange={(v) => setFilter(index, { value: v })}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="is…" />
                </SelectTrigger>
                <SelectContent>
                  {optionsFor(filter.field).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove condition"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    filters: current.filters.filter((_, i) => i !== index),
                  }))
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {unusedFilter && draft.filters.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  filters: [...current.filters, { field: unusedFilter.key, value: "" }],
                }))
              }
            >
              <Plus className="size-4" />
              Add condition
            </Button>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={incomplete || mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : card ? "Save changes" : "Add card"}
        </Button>
      </DialogFooter>
    </>
  );
}
