export async function fetchProxy(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach the local app proxy. Make sure the Express server is running on the expected port. Original browser error: ${message}`);
  }
}

export function describeApiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const root = data as any;
    const error = root.error ?? root;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const message = error.message ?? error.error?.message ?? root.message;
      const details = error.details ?? error.cause ?? error.code;
      if (message && details) return `${String(message)}\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}`;
      if (message) return String(message);
    }
    if (typeof root.message === 'string') return root.message;
  }
  return fallback;
}

export async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    throw new Error(describeApiError(data, text || response.statusText || `HTTP ${response.status}`));
  }

  return data;
}
