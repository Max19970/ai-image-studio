import { useEffect, useMemo, useState } from 'react';
import {
  createSyncedDocumentState,
  type SyncDocumentDescriptor,
  type SyncedDocumentHydration,
  type SyncedDocumentValueUpdate
} from '../../../processes/storage-sync/documentSyncEngine';

export interface SyncedDocumentView<TValue> {
  value: TValue;
  setValue(update: SyncedDocumentValueUpdate<TValue>): void;
  hydration: SyncedDocumentHydration;
}

export function useSyncedDocumentState<TValue, TContext = void>(
  descriptor: SyncDocumentDescriptor<TValue, TContext>,
  context: TContext
): SyncedDocumentView<TValue> {
  const controller = useMemo(
    () => createSyncedDocumentState(descriptor, context),
    [descriptor, context]
  );
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => {
    setSnapshot(controller.getSnapshot());
    const unsubscribe = controller.subscribe(() => setSnapshot(controller.getSnapshot()));
    void controller.hydrate();
    return unsubscribe;
  }, [controller]);

  return {
    value: snapshot.value,
    setValue: controller.setValue,
    hydration: snapshot.hydration
  };
}
