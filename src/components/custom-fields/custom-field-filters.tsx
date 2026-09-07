"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CustomField, CustomFieldEntity } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectOptions } from "@/lib/custom-fields";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { CustomFieldDialog } from "@/components/custom-fields/custom-field-dialog";

// "No filter" needs a non-empty value for Radix Select.
const ANY = "__ANY__";

interface CustomFieldFiltersProps {
  entity: CustomFieldEntity;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

function FilterControl({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (field.type) {
    case "DATE":
      return (
        <DatePicker value={value} onChange={onChange} className="w-full sm:w-40" placeholder={field.name} />
      );
    case "CHECKBOX":
      return (
        <Select value={value || ANY} onValueChange={(next) => onChange(next === ANY ? "" : next)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{field.name}: any</SelectItem>
            <SelectItem value="true">{field.name}: yes</SelectItem>
            <SelectItem value="false">{field.name}: no</SelectItem>
          </SelectContent>
        </Select>
      );
    case "SELECT":
      return (
        <Select value={value || ANY} onValueChange={(next) => onChange(next === ANY ? "" : next)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{field.name}: any</SelectItem>
            {selectOptions(field).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "NUMBER":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.name}
          className="w-full sm:w-40"
        />
      );
    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${field.name}…`}
          className="w-full sm:w-44"
        />
      );
  }
}

/**
 * One filter control per field the user has defined, plus the button to define a
 * new one. A filter can only exist where the data does, so "Add filter" creates
 * the field itself — it then shows up in the form and the table as well.
 */
export function CustomFieldFilters({ entity, values, onChange }: CustomFieldFiltersProps) {
  const { data: fields = [] } = useCustomFields(entity);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {fields.map((field) => (
        <FilterControl
          key={field.id}
          field={field}
          value={values[field.id] ?? ""}
          onChange={(value) => onChange({ ...values, [field.id]: value })}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        title="Add a field of your own — it becomes a filter here, an input on the form, and a column in the table"
      >
        <Plus className="size-4" />
        Add filter
      </Button>

      <CustomFieldDialog open={dialogOpen} onOpenChange={setDialogOpen} entity={entity} />
    </>
  );
}
