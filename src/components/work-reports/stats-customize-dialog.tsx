"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomCardDialog } from "@/components/cards/custom-card-dialog";
import { setPreference } from "@/actions/preference-actions";
import { deleteCustomCard } from "@/actions/custom-card-actions";
import { useCustomCards } from "@/hooks/use-custom-cards";
import { useRefresh } from "@/hooks/use-refresh";
import { customCardId, type CustomCardValue } from "@/lib/custom-cards";
import type { CardOption } from "@/lib/card-preferences";

// Shared by every card strip in the app — the dashboard and the money page each
// pass their own catalogue, defaults and preference key.
interface StatsCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: string[];
  catalogue: readonly string[];
  meta: Record<string, CardOption>;
  defaults: string[];
  preferenceKey: string;
  /** What to say when the user has hidden every card. */
  emptyHint?: string;
}

type BodyProps = Omit<StatsCustomizeDialogProps, "open">;

/**
 * The editing state lives here rather than in the wrapper: Radix unmounts dialog
 * content on close, so each open starts from the saved cards with no reset effect.
 */
function CustomizeBody({
  cards,
  onOpenChange,
  catalogue,
  meta,
  defaults,
  preferenceKey,
  emptyHint = "No cards — the strip above will be hidden entirely.",
}: BodyProps) {
  const queryClient = useQueryClient();
  const refresh = useRefresh();
  const { data: customCards = [] } = useCustomCards();
  const [draft, setDraft] = useState<string[]>(cards);
  const [building, setBuilding] = useState(false);
  const [editing, setEditing] = useState<CustomCardValue | undefined>(undefined);
  const [removing, setRemoving] = useState<CustomCardValue | undefined>(undefined);

  const available = catalogue.filter((id) => !draft.includes(id));
  const ownById = new Map(customCards.map((card) => [customCardId(card.id), card]));

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCustomCard(id),
    onSuccess: (_result, id) => {
      toast.success("Card deleted");
      refresh("customCard");
      // The strip would otherwise keep showing a card that no longer exists.
      setDraft((current) => current.filter((cardId) => cardId !== customCardId(id)));
      setRemoving(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete the card"),
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  };

  const mutation = useMutation({
    mutationFn: (value: string[]) => setPreference(preferenceKey, value),
    onSuccess: () => {
      toast.success("Cards updated");
      queryClient.invalidateQueries({ queryKey: ["preference", preferenceKey] });
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
            <p className="text-xs text-muted-foreground">{emptyHint}</p>
          ) : (
            <ul className="space-y-1.5">
              {draft.map((id, index) => (
                <li key={id} className="flex items-center gap-2 rounded-md border p-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{meta[id].label}</span>
                  {meta[id].badge && (
                    <Badge variant="secondary" className="shrink-0">
                      {meta[id].badge}
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
                  {ownById.has(id) && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(ownById.get(id))}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit this card</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRemoving(ownById.get(id))}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete this card</span>
                      </Button>
                    </>
                  )}
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
            <p className="text-xs text-muted-foreground">Every card is already shown.</p>
          ) : (
            <ul className="space-y-1.5">
              {available.map((id) => (
                <li key={id} className="flex items-center gap-2 rounded-md border border-dashed p-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {meta[id].label}
                  </span>
                  {meta[id].badge && (
                    <Badge variant="outline" className="shrink-0">
                      {meta[id].badge}
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

        <Button type="button" variant="outline" size="sm" onClick={() => setBuilding(true)}>
          <Sparkles className="size-4" />
          Build a card
        </Button>
      </div>

      <CustomCardDialog
        open={building}
        onOpenChange={setBuilding}
        // Something just built is something you wanted to see.
        onSaved={(id) => setDraft((current) => [...current, customCardId(id)])}
      />
      <CustomCardDialog
        key={editing?.id}
        open={!!editing}
        onOpenChange={(next) => !next && setEditing(undefined)}
        card={editing}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(next) => !next && setRemoving(undefined)}
        title="Delete card?"
        description={removing ? `"${removing.title}" will be gone for good.` : undefined}
        onConfirm={() => removing && removeMutation.mutate(removing.id)}
      />

      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={() => setDraft(defaults)}>
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

export function StatsCustomizeDialog({ open, ...body }: StatsCustomizeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={body.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <CustomizeBody {...body} />
      </DialogContent>
    </Dialog>
  );
}
