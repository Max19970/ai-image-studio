export function compactCause(error: unknown): string | undefined {
  const anyError = error as { name?: unknown; code?: unknown; cause?: unknown };
  const cause = anyError.cause;
  const parts: string[] = [];

  if (anyError.name && anyError.name !== 'Error') parts.push(String(anyError.name));
  if (anyError.code) parts.push(String(anyError.code));

  if (cause && typeof cause === 'object') {
    const source = cause as Record<string, unknown>;
    for (const key of ['code', 'syscall', 'hostname', 'address', 'port', 'message']) {
      if (source[key]) parts.push(String(source[key]));
    }
  } else if (typeof cause === 'string') {
    parts.push(cause);
  }

  return [...new Set(parts.filter(Boolean))].join(' · ') || undefined;
}
