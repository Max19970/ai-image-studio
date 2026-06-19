export interface ObjectUrlLifecycle<T extends object> {
  createObjectUrl: (item: T) => string;
  revokeObjectUrl: (url: string) => void;
}

export interface ObjectUrlRegistry<T extends object> {
  reconcile(items: readonly T[]): boolean;
  get(item: T): string | undefined;
  snapshot(): Map<T, string>;
  releaseAll(): boolean;
}

function createBrowserObjectUrlLifecycle<T extends object>(): ObjectUrlLifecycle<T> {
  return {
    createObjectUrl: (item) => URL.createObjectURL(item as unknown as Blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url)
  };
}

export function createObjectUrlRegistry<T extends object>(lifecycle: ObjectUrlLifecycle<T> = createBrowserObjectUrlLifecycle<T>()): ObjectUrlRegistry<T> {
  const urls = new Map<T, string>();

  return {
    reconcile(items) {
      let changed = false;
      const activeItems = new Set(items);

      for (const item of activeItems) {
        if (!urls.has(item)) {
          urls.set(item, lifecycle.createObjectUrl(item));
          changed = true;
        }
      }

      for (const [item, url] of [...urls.entries()]) {
        if (!activeItems.has(item)) {
          lifecycle.revokeObjectUrl(url);
          urls.delete(item);
          changed = true;
        }
      }

      return changed;
    },

    get(item) {
      return urls.get(item);
    },

    snapshot() {
      return new Map(urls);
    },

    releaseAll() {
      if (urls.size === 0) return false;
      for (const url of urls.values()) lifecycle.revokeObjectUrl(url);
      urls.clear();
      return true;
    }
  };
}
