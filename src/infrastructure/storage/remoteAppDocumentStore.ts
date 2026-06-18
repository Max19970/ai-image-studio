async function fetchStorage(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach local storage backend. Make sure the Express server is running. ${message}`);
  }
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new Error(text || response.statusText);
  return (text ? JSON.parse(text) : null) as T;
}

export async function loadRemoteAppDocument<T>(endpoint: string, fallback: T): Promise<T> {
  const response = await fetchStorage(endpoint);
  const data = await readJsonOrThrow<{ value?: T | null }>(response);
  return data.value ?? fallback;
}

export async function saveRemoteAppDocument(endpoint: string, key: string, value: unknown): Promise<void> {
  const response = await fetchStorage(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: value })
  });
  await readJsonOrThrow(response);
}

export async function deleteRemoteAppDocument(endpoint: string): Promise<void> {
  const response = await fetchStorage(endpoint, { method: 'DELETE' });
  await readJsonOrThrow(response);
}
