"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setPreference } from "@/actions/preference-actions";
import {
  DASHBOARD_CARD_IDS,
  DASHBOARD_CARD_META,
  DASHBOARD_CARDS_PREFERENCE_KEY,
  DEFAULT_DASHBOARD_CARDS,
  type DashboardCardId,
} from "@/lib/dashboard-cards";

interface StatsCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: DashboardCardId[];
}

/**
 * The editing state lives here rather than in the wrapper: Radix unmounts dialog
 * content on close, so each open starts from the saved cards with no reset effect.
 */
function CustomizeBody({
  cards,
  onOpenChange,
}: {
  cards: DashboardCardId[];
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DashboardCardId[]>(cards);

  const available = DASHBOARD_CARD_IDS.filter((id) => !draft.includes(id));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  };

  const mutation = useMutation({
    mutationFn: (value: DashboardCardId[]) => setPreference(DASHBOARD_CARDS_PREFERENCE_KEY, value),
    onSuccess: () => {
      toast.success("Cards updated");
      queryClient.invalidateQueries({ queryKey: ["preference", DASHBOARD_CARDS_PREFERENCE_KEY] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save cards"),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose your cards</DialogTitle>
        <DialogDescription>
          Pick the numbers you care about and put them in the order you want to read them.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Shown ({draft.length})</p>
          {draft.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No cards — the strip above the table will be hidden entirely.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {draft.map((id, index) => (
                <li key={id} className="flex items-center gap-2 rounded-md border p-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{DASHBOARD_CARD_META[id].label}</span>
                  {DASHBOARD_CARD_META[id].scopedToCompany && (
                    <Badge variant="secondary" className="shrink-0">
                      This company
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                    <span className="sr-only">Move up</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                    <span className="sr-only">Move down</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDraft(draft.filter((c) => c !== id))}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Hide this card</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Available ({available.length})</p>
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground">Every card is already on the dashboard.</p>
          ) : (
            <ul className="space-y-1.5">
              {available.map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-md border border-dashed p-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {DASHBOARD_CARD_META[id].label}
                  </span>
                  {DASHBOARD_CARD_META[id].scopedToCompany && (
                    <Badge variant="outline" className="shrink-0">
                      This company
                    </Badge>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDraft([...draft, id])}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={() => setDraft(DEFAULT_DASHBOARD_CARDS)}>
          <RotateCcw className="size-4" />
          Reset
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(draft)}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function StatsCustomizeDialog({ open, onOpenChange, cards }: StatsCustomizeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <CustomizeBody cards={cards} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
