export interface SyncDocumentDescriptor<TValue, TContext = void> {
  id: string;
  loadFallback(context: TContext): TValue;
  saveFallback(value: TValue, context: TContext): void;
  loadRemote(context: TContext): Promise<TValue>;
  saveRemote(value: TValue, context: TContext): Promise<void>;
  normalize(value: TValue, context: TContext): TValue;
  messages: {
    loadRemoteFailed: string;
    saveRemoteFailed: string;
  };
}

export type SyncedDocumentHydration = 'loading' | 'ready' | 'degraded';

export interface SyncedDocumentSnapshot<TValue> {
  value: TValue;
  hydration: SyncedDocumentHydration;
  warning: string | null;
}

export type SyncedDocumentValueUpdate<TValue> = TValue | ((current: TValue) => TValue);

export interface SyncedDocumentState<TValue> {
  getSnapshot(): SyncedDocumentSnapshot<TValue>;
  subscribe(listener: () => void): () => void;
  setValue(update: SyncedDocumentValueUpdate<TValue>): void;
  hydrate(): Promise<void>;
  flushForTests(): Promise<void>;
  dispose(): void;
}

interface PendingSave<TValue> {
  revision: number;
  value: TValue;
}

export function createSyncedDocumentState<TValue, TContext = void>(
  descriptor: SyncDocumentDescriptor<TValue, TContext>,
  context: TContext
): SyncedDocumentState<TValue> {
  let value = descriptor.normalize(descriptor.loadFallback(context), context);
  let hydration: SyncedDocumentHydration = 'loading';
  let warning: string | null = null;
  let localRevision = 0;
  let disposed = false;
  let hydrationPromise: Promise<void> | null = null;
  let inFlightSave: Promise<void> | null = null;
  let inFlightRevision = 0;
  let pendingSave: PendingSave<TValue> | null = null;
  let lastCompletedSaveRevision = 0;
  const listeners = new Set<() => void>();
  const idleWaiters = new Set<() => void>();

  function snapshot(): SyncedDocumentSnapshot<TValue> {
    return { value, hydration, warning };
  }

  function notify() {
    if (disposed) return;
    for (const listener of listeners) listener();
  }

  function resolveIdleWaiters() {
    if (inFlightSave || pendingSave) return;
    for (const resolve of idleWaiters) resolve();
    idleWaiters.clear();
  }

  function setReadyAfterSave() {
    if (disposed) return;
    hydration = 'ready';
    warning = null;
    notify();
  }

  function startNextSave() {
    if (inFlightSave || !pendingSave) {
      resolveIdleWaiters();
      return;
    }

    const next = pendingSave;
    pendingSave = null;
    inFlightRevision = next.revision;
    let remoteSave: Promise<void>;
    try {
      remoteSave = descriptor.saveRemote(next.value, context);
    } catch (error) {
      remoteSave = Promise.reject(error);
    }
    inFlightSave = remoteSave
      .then(() => {
        lastCompletedSaveRevision = Math.max(lastCompletedSaveRevision, next.revision);
        setReadyAfterSave();
      })
      .catch((error) => {
        console.warn(descriptor.messages.saveRemoteFailed, error);
        if (!disposed) {
          hydration = 'degraded';
          warning = descriptor.messages.saveRemoteFailed;
          notify();
        }
      })
      .finally(() => {
        inFlightSave = null;
        inFlightRevision = 0;
        startNextSave();
      });
  }

  function enqueueSave(nextValue: TValue, revision: number) {
    const highestScheduledRevision = Math.max(
      lastCompletedSaveRevision,
      inFlightRevision,
      pendingSave?.revision ?? 0
    );
    if (revision <= highestScheduledRevision) return;
    pendingSave = { revision, value: nextValue };
    startNextSave();
  }

  function setValue(update: SyncedDocumentValueUpdate<TValue>) {
    const candidate = typeof update === 'function'
      ? (update as (current: TValue) => TValue)(value)
      : update;
    value = descriptor.normalize(candidate, context);
    localRevision += 1;
    descriptor.saveFallback(value, context);
    notify();
    enqueueSave(value, localRevision);
  }

  async function hydrate(): Promise<void> {
    if (hydrationPromise) return hydrationPromise;
    const revisionAtStart = localRevision;
    hydrationPromise = (async () => {
      try {
        const remoteValue = descriptor.normalize(await descriptor.loadRemote(context), context);
        if (disposed) return;
        if (localRevision === revisionAtStart) {
          value = remoteValue;
          descriptor.saveFallback(value, context);
        } else {
          enqueueSave(value, localRevision);
        }
        hydration = 'ready';
        warning = null;
        notify();
      } catch (error) {
        console.warn(descriptor.messages.loadRemoteFailed, error);
        if (!disposed) {
          hydration = 'degraded';
          warning = descriptor.messages.loadRemoteFailed;
          notify();
        }
      }
    })();
    return hydrationPromise;
  }

  return {
    getSnapshot: snapshot,
    subscribe(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setValue,
    hydrate,
    async flushForTests() {
      if (hydrationPromise) await hydrationPromise;
      while (inFlightSave || pendingSave) {
        await new Promise<void>((resolve) => idleWaiters.add(resolve));
      }
    },
    dispose() {
      disposed = true;
      listeners.clear();
    }
  };
}

export function voidContext(): void {
  return undefined;
}
