import { useEffect, useMemo, useRef, useState } from 'react';
import { createObjectUrlRegistry, type ObjectUrlRegistry } from './objectUrlRegistry';

export function useFileObjectUrls(files: readonly File[]): Map<File, string> {
  const registryRef = useRef<ObjectUrlRegistry<File> | null>(null);
  const [version, setVersion] = useState(0);

  if (!registryRef.current) registryRef.current = createObjectUrlRegistry<File>();

  useEffect(() => {
    const changed = registryRef.current?.reconcile(files) ?? false;
    if (changed) setVersion((value) => value + 1);
  }, [files]);

  useEffect(() => () => {
    registryRef.current?.releaseAll();
    registryRef.current = null;
  }, []);

  return useMemo(() => registryRef.current?.snapshot() ?? new Map<File, string>(), [version]);
}
