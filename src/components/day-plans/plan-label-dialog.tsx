"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRefresh } from "@/hooks/use-refresh";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { PlanLabel } from "@prisma/client";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColourPickerButton } from "@/components/ui/colour-picker";
import { cn } from "@/lib/utils";
import {
  BUILT_IN_PLAN_LABELS,
  DEFAULT_LABEL_COLOUR,
  PLAN_COLOUR_PRESETS,
  normaliseColour,
} from "@/lib/plan-labels";
import { usePlanLabels } from "@/hooks/use-plan-labels";
import { createPlanLabel, deletePlanLabel, updatePlanLabel } from "@/actions/plan-label-actions";

interface PlanLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new label's id, so the picker can select what was just added. */
  onCreated?: (id: string) => void;
  /** Called with a removed label's id, so anything still pointing at it can let go. */
  onDeleted?: (id: string) => void;
}

export function PlanLabelDialog({ open, onOpenChange, onCreated, onDeleted }: PlanLabelDialogProps) {
  const refresh = useRefresh();
  const { data: labels = [] } = usePlanLabels();

  const [name, setName] = useState("");
  const [colour, setColour] = useState(DEFAULT_LABEL_COLOUR);
  const [deleting, setDeleting] = useState<PlanLabel | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: () => createPlanLabel({ name, colour }),
    onSuccess: (label) => {
      toast.success(`Added "${label.name}"`);
      setName("");
      refresh("planLabel");
      onCreated?.(label.id);
    },
    onError: (error: Error) => toast.error(error.message || "Could not add the label"),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name: string; colour: string }) =>
      updatePlanLabel(input.id, { name: input.name, colour: input.colour }),
    onSuccess: () => refresh("planLabel"),
    onError: (error: Error) => toast.error(error.message || "Could not save the label"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlanLabel(id),
    onSuccess: (_result, id) => {
      toast.success("Label removed");
      refresh("planLabel");
      onDeleted?.(id);
      setDeleting(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Could not remove the label"),
  });

  // Renaming to nothing would leave an unclickable chip, so an empty box reverts.
  const rename = (label: PlanLabel, next: string) => {
    const trimmed = next.trim();
    if (!trimmed || trimmed === label.name) return;
    updateMutation.mutate({ id: label.id, name: trimmed, colour: normaliseColour(label.colour) });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Labels</DialogTitle>
            <DialogDescription>
              Add your own labels alongside the built-in ones, in any colour. Removing one puts its
              to-dos back on General.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="new-label-name">New label</Label>
              <div className="flex gap-2">
                <ColourPickerButton
                  value={colour}
                  onChange={setColour}
                  presets={PLAN_COLOUR_PRESETS}
                  label="New label colour"
                />
                <Input
                  id="new-label-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Invoicing"
                  maxLength={40}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) {
                      e.preventDefault();
                      createMutation.mutate();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={!name.trim() || createMutation.isPending}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
              {/* What the chip will look like once it is added. */}
              <div className="pt-1">
                <span
                  className="plan-label-badge inline-flex items-center gap-1.5 rounded-4xl px-2.5 py-1 text-xs font-medium"
                  style={{ "--plan-label": colour } as React.CSSProperties}
                >
                  <span
                    className="plan-label-dot size-2.5 rounded-full"
                    style={{ "--plan-label": colour } as React.CSSProperties}
                  />
                  {name.trim() || "Preview"}
                </span>
              </div>
            </div>

            {labels.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Your labels</p>
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-2 rounded-md border p-2">
                    <ColourPickerButton
                      value={normaliseColour(label.colour)}
                      onChange={(next) =>
                        updateMutation.mutate({ id: label.id, name: label.name, colour: next })
                      }
                      presets={PLAN_COLOUR_PRESETS}
                      label={`Colour for ${label.name}`}
                    />
                    <Input
                      className="flex-1"
                      defaultValue={label.name}
                      maxLength={40}
                      onBlur={(e) => rename(label, e.target.value)}
                      aria-label={`Rename ${label.name}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(label)}
                      aria-label={`Remove ${label.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Built in</p>
              <div className="flex flex-wrap gap-1.5">
                {BUILT_IN_PLAN_LABELS.map((look) => (
                  <span
                    key={look.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-4xl px-2.5 py-1 text-xs font-medium",
                      look.badge
                    )}
                  >
                    <span className={cn("size-2.5 rounded-full", look.dot)} />
                    {look.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(next) => !next && setDeleting(undefined)}
        title="Remove label?"
        description={
          deleting
            ? `"${deleting.name}" will be removed, and any to-do wearing it goes back to General.`
            : undefined
        }
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </>
  );
}
