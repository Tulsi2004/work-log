"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { CustomField, CustomFieldEntity } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CUSTOM_FIELD_ENTITY_LABELS,
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPE_LABELS,
  selectOptions,
} from "@/lib/custom-fields";
import { customFieldSchema, type CustomFieldInput } from "@/lib/validations/custom-field";
import { createCustomField, updateCustomField, deleteCustomField } from "@/actions/custom-field-actions";

function toDefaultValues(entity: CustomFieldEntity, field?: CustomField): CustomFieldInput {
  const options = field ? selectOptions(field) : [];
  return {
    entity,
    name: field?.name ?? "",
    type: field?.type ?? "TEXT",
    options: options.length ? options.map((value) => ({ value })) : [{ value: "" }],
    required: field?.required ?? false,
  };
}

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: CustomFieldEntity;
  field?: CustomField;
}

/**
 * Creates or edits a field definition. Opened from inside a record's form, so it
 * lives in a portal — its submit must not bubble up and submit the record too.
 */
export function CustomFieldDialog({ open, onOpenChange, entity, field }: CustomFieldDialogProps) {
  const isEditing = !!field;
  const queryClient = useQueryClient();

  const form = useForm<CustomFieldInput>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: toDefaultValues(entity, field),
  });

  useEffect(() => {
    if (open) form.reset(toDefaultValues(entity, field));
  }, [open, entity, field, form]);

  const { fields: optionFields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });
  const type = form.watch("type");

  const mutation = useMutation({
    mutationFn: async (values: CustomFieldInput) => {
      if (isEditing) {
        await updateCustomField(field!.id, values);
      } else {
        await createCustomField(values);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Field updated" : "Field added");
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      queryClient.invalidateQueries({ queryKey: ["employments"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomField(field!.id),
    onSuccess: () => {
      toast.success("Field removed");
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["day-plans"] });
      queryClient.invalidateQueries({ queryKey: ["employments"] });
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove field"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit field" : "Add field"}</DialogTitle>
          <DialogDescription>
            A field of your own on every {CUSTOM_FIELD_ENTITY_LABELS[entity].toLowerCase()} record, not just
            this one.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            // React portals bubble events through the React tree, so without this
            // the outer record form would submit alongside this one.
            onSubmit={(event) => {
              event.stopPropagation();
              void form.handleSubmit((values) => mutation.mutate(values))(event);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field: controlled }) => (
                <FormItem>
                  <FormLabel>Field name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Client PO number" {...controlled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field: controlled }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={controlled.value} onValueChange={controlled.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOM_FIELD_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {CUSTOM_FIELD_TYPE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Changing the type clears what is already saved in this field.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === "SELECT" && (
              <div className="space-y-2">
                <FormLabel>Choices</FormLabel>
                {optionFields.map((option, index) => (
                  <div key={option.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`options.${index}.value`}
                      render={({ field: controlled }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder={`Choice ${index + 1}`} {...controlled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      disabled={optionFields.length === 1}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove choice</span>
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
                  <Plus className="size-4" />
                  Add choice
                </Button>
                {form.formState.errors.options?.message && (
                  <p className="text-sm text-destructive">{form.formState.errors.options.message}</p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="required"
              render={({ field: controlled }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={controlled.value} onCheckedChange={controlled.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Required — cannot be left blank</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-between">
              {isEditing ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Add field"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove field?"
          description={
            field ? `This removes "${field.name}" and everything saved in it, on every record.` : undefined
          }
          onConfirm={() => deleteMutation.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}
