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

export interface SyncDocumentRuntime<TValue, TContext = void> {
  descriptor: SyncDocumentDescriptor<TValue, TContext>;
  loadFallback(context: TContext): TValue;
  loadFromRemote(context: TContext): Promise<TValue>;
  save(value: TValue, context: TContext): void;
}

export function createSyncDocumentRuntime<TValue, TContext = void>(descriptor: SyncDocumentDescriptor<TValue, TContext>): SyncDocumentRuntime<TValue, TContext> {
  const loadFallback = (context: TContext) => descriptor.normalize(descriptor.loadFallback(context), context);

  return {
    descriptor,
    loadFallback,
    async loadFromRemote(context: TContext): Promise<TValue> {
      try {
        const value = descriptor.normalize(await descriptor.loadRemote(context), context);
        descriptor.saveFallback(value, context);
        return value;
      } catch (error) {
        console.warn(descriptor.messages.loadRemoteFailed, error);
        return loadFallback(context);
      }
    },
    save(value: TValue, context: TContext): void {
      const safeValue = descriptor.normalize(value, context);
      descriptor.saveFallback(safeValue, context);
      void descriptor.saveRemote(safeValue, context).catch((error) => {
        console.warn(descriptor.messages.saveRemoteFailed, error);
      });
    }
  };
}

export function voidContext(): void {
  return undefined;
}
