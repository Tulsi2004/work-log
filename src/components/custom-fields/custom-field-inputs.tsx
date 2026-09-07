"use client";

import { useEffect, useState } from "react";
import { useFormContext, type FieldValues } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CustomField, CustomFieldEntity } from "@prisma/client";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomFieldDialog } from "@/components/custom-fields/custom-field-dialog";
import { selectOptions, toFormCustomValues, type CustomValues } from "@/lib/custom-fields";
import { deleteCustomField } from "@/actions/custom-field-actions";
import { useCustomFields } from "@/hooks/use-custom-fields";

// Radix Select has no empty value, so "not answered" needs a sentinel.
const CLEARED = "__NONE__";

interface CustomFieldControlProps {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
}

function CustomFieldControl({ field, value, onChange }: CustomFieldControlProps) {
  switch (field.type) {
    case "LONG_TEXT":
      return <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "NUMBER":
      return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "DATE":
      return <DatePicker value={value} onChange={onChange} />;
    case "CHECKBOX":
      return (
        <Checkbox
          checked={value === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        />
      );
    case "SELECT": {
      const options = selectOptions(field);
      return (
        <Select
          value={value || CLEARED}
          onValueChange={(next) => onChange(next === CLEARED ? "" : next)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEARED}>—</SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

/**
 * The user's own fields for `entity`: their inputs, bound to `customValues` on the
 * surrounding form, plus the controls to add, edit and remove the fields themselves.
 * Every button here is type="button" — they sit inside the record's <form>.
 */
export function CustomFieldInputs({ entity }: { entity: CustomFieldEntity }) {
  const { data: fields = [] } = useCustomFields(entity);
  const { control, getValues, setValue } = useFormContext<FieldValues>();
  const queryClient = useQueryClient();

  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | undefined>(undefined);
  const [deletingField, setDeletingField] = useState<CustomField | undefined>(undefined);

  // A field added while this form is open has no key in `customValues` yet. Fill in
  // the gaps without touching what is already typed — a reset here would wipe it.
  useEffect(() => {
    const current = (getValues("customValues") ?? {}) as CustomValues;
    const next = toFormCustomValues(fields, current);
    const changed =
      Object.keys(next).length !== Object.keys(current).length ||
      Object.keys(next).some((key) => !(key in current));
    if (changed) setValue("customValues", next);
  }, [fields, getValues, setValue]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomField(id),
    onSuccess: () => {
      toast.success("Field removed");
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      queryClient.invalidateQueries({ queryKey: ["employments"] });
      setDeletingField(undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove field"),
  });

  const openFieldDialog = (field?: CustomField) => {
    setEditingField(field);
    setFieldDialogOpen(true);
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Your fields</p>
        <Button type="button" variant="outline" size="sm" onClick={() => openFieldDialog()}>
          <Plus className="size-4" />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Need something the form above does not have? Add your own field — it will appear here on every
          record, and in the table and filters.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <FormField
              key={field.id}
              control={control}
              name={`customValues.${field.id}`}
              render={({ field: controlled }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>
                      {field.name}
                      {field.required && <span className="text-destructive"> *</span>}
                    </FormLabel>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openFieldDialog(field)}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit {field.name}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingField(field)}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Remove {field.name}</span>
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <CustomFieldControl
                      field={field}
                      value={(controlled.value as string) ?? (field.type === "CHECKBOX" ? "false" : "")}
                      onChange={controlled.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      )}

      <CustomFieldDialog
        open={fieldDialogOpen}
        onOpenChange={setFieldDialogOpen}
        entity={entity}
        field={editingField}
      />

      <ConfirmDialog
        open={!!deletingField}
        onOpenChange={(open) => !open && setDeletingField(undefined)}
        title="Remove field?"
        description={
          deletingField
            ? `This removes "${deletingField.name}" and everything saved in it, on every record — not just this one.`
            : undefined
        }
        onConfirm={() => deletingField && deleteMutation.mutate(deletingField.id)}
      />
    </div>
  );
}
