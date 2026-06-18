export function imageExtension(format: string) {
  if (format === 'jpeg') return 'jpg';
  if (format === 'url') return 'png';
  return format || 'png';
}
