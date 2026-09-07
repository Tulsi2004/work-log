"use client";

import type { CustomFieldEntity } from "@prisma/client";
import { formatCustomValue, isBlankCustomValue, type CustomValues } from "@/lib/custom-fields";
import { useCustomFields } from "@/hooks/use-custom-fields";

/**
 * Reads back the user's own fields on one record. Renders nothing when the user
 * has defined no fields, or filled none in on this record.
 */
export function CustomFieldValueList({
  entity,
  values,
  className,
}: {
  entity: CustomFieldEntity;
  values: CustomValues;
  className?: string;
}) {
  const { data: fields = [] } = useCustomFields(entity);
  const filled = fields.filter((field) => !isBlankCustomValue(field, values[field.id]));
  if (filled.length === 0) return null;

  return (
    <div className={className ?? "flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground"}>
      {filled.map((field) => (
        <span key={field.id}>
          <span className="font-medium">{field.name}:</span> {formatCustomValue(field, values[field.id])}
        </span>
      ))}
    </div>
  );
}
