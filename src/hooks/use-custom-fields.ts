"use client";

import { useQuery } from "@tanstack/react-query";
import type { CustomFieldEntity } from "@prisma/client";
import { listCustomFields } from "@/actions/custom-field-actions";

export function useCustomFields(entity: CustomFieldEntity) {
  return useQuery({
    queryKey: ["custom-fields", entity],
    queryFn: () => listCustomFields(entity),
  });
}
