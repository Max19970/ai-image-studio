export function parseOpenAiCompatibleSseBlock(block: string): unknown[] {
  const dataLines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');

  return dataLines.flatMap((line) => {
    try {
      return [globalThis.JSON.parse(line)];
    } catch {
      return [];
    }
  });
}
