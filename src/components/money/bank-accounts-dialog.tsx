"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { setPreference } from "@/actions/preference-actions";
import { sumMoney } from "@/lib/money";
import { ACCOUNT_BALANCE_PREFERENCE_KEY, type BankAccount } from "@/lib/money-cards";
import { formatMoney } from "@/utils/format";

interface BankAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccount[];
}

export function BankAccountsDialog({ open, onOpenChange, accounts }: BankAccountsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {/* Mounted only while open, so every opening starts from what is saved. */}
        {open && <Body accounts={accounts} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

type Row = { name: string; balance: string };

const BLANK_ROW: Row = { name: "", balance: "" };

function Body({ accounts, onOpenChange }: Omit<BankAccountsDialogProps, "open">) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() =>
    accounts.length ? accounts.map((a) => ({ name: a.name, balance: String(a.balance) })) : [BLANK_ROW]
  );

  const mutation = useMutation({
    mutationFn: (value: BankAccount[]) => setPreference(ACCOUNT_BALANCE_PREFERENCE_KEY, value),
    onSuccess: () => {
      toast.success("Balances saved");
      queryClient.invalidateQueries({ queryKey: ["preference", ACCOUNT_BALANCE_PREFERENCE_KEY] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save balances"),
  });

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // A row left completely blank is just dropped.
  const filled = rows.filter((row) => row.name.trim() || row.balance.trim());
  const isComplete = (row: Row) =>
    !!row.name.trim() && row.balance.trim() !== "" && Number.isFinite(Number(row.balance));
  const total = sumMoney(filled.filter(isComplete).map((row) => Number(row.balance)));

  const save = () => {
    if (mutation.isPending) return;
    if (!filled.every(isComplete)) return toast.error("Each account needs a name and a balance");
    mutation.mutate(filled.map((row) => ({ name: row.name.trim(), balance: Number(row.balance) })));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Bank accounts</DialogTitle>
        <DialogDescription>
          Add each account you hold and the balance your bank app shows for it. The card adds them
          up — come back and update a balance whenever you check it.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_9rem_2rem] gap-2 text-xs font-medium text-muted-foreground">
          <span>Account</span>
          <span>Current balance</span>
        </div>

        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_9rem_2rem] items-center gap-2">
            <Input
              autoFocus={index === rows.length - 1 && !row.name}
              value={row.name}
              onChange={(e) => setRow(index, { name: e.target.value })}
              placeholder="e.g. SBI Savings"
              aria-label="Account name"
            />
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>₹</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                type="number"
                step="0.01"
                inputMode="decimal"
                value={row.balance}
                onChange={(e) => setRow(index, { balance: e.target.value })}
                placeholder="0"
                aria-label={`${row.name.trim() || "Account"} balance`}
              />
            </InputGroup>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              aria-label={`Remove ${row.name.trim() || "this account"}`}
              title="Remove account"
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="py-2 text-center text-muted-foreground">No accounts. Add one below.</p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setRows((current) => [...current, BLANK_ROW])}
        >
          <Plus />
          Add another account
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
        <span className="text-muted-foreground">
          Total across {filled.length} {filled.length === 1 ? "account" : "accounts"}
        </span>
        <span className="text-base font-semibold tabular-nums">{formatMoney(total)}</span>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save balances"}
        </Button>
      </DialogFooter>
    </form>
  );
}
