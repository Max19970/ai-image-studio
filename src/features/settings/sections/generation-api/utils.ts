export function fieldId(prefix: string, value: string) {
  return prefix ? `${prefix}${value[0]?.toUpperCase() ?? ''}${value.slice(1)}` : value;
}
