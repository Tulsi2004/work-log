// Custom-field filters ride the query string as `cf_<fieldId>=<value>`, so they
// need no schema changes as the user adds and removes fields.
export const CUSTOM_FILTER_PREFIX = "cf_";

export interface CustomFilter {
  fieldId: string;
  value: string;
}

export function readCustomFilters(params: URLSearchParams): CustomFilter[] {
  const filters: CustomFilter[] = [];
  for (const [key, rawValue] of params.entries()) {
    if (!key.startsWith(CUSTOM_FILTER_PREFIX)) continue;
    const value = rawValue.trim();
    if (!value) continue;
    filters.push({ fieldId: key.slice(CUSTOM_FILTER_PREFIX.length), value });
  }
  return filters;
}

export function toCustomFilterParams(values: Record<string, string>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [fieldId, value] of Object.entries(values)) {
    if (value) params[`${CUSTOM_FILTER_PREFIX}${fieldId}`] = value;
  }
  return params;
}
