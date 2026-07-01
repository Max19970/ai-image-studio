import type { ComfyUiResourceCacheEntry } from '../../../../../domain/comfyUiSettings';
import { cacheAge } from './comfyUiResourceOptions';
import styles from './ComfyUiSettingsPanel.module.css';

interface ResourceStatProps {
  label: string;
  cache: ComfyUiResourceCacheEntry | null;
  emptyLabel: string;
}

function ResourceStat({ label, cache, emptyLabel }: ResourceStatProps) {
  return (
    <div className={styles.statCard}>
      <span>{label}</span>
      <strong>{cache ? cache.items.length : 0}</strong>
      <small>{cacheAge(cache, emptyLabel)}</small>
    </div>
  );
}

interface ComfyUiResourceStatsProps {
  labels: {
    checkpoints: string;
    loras: string;
    samplers: string;
    schedulers: string;
    upscaleModels: string;
    notLoaded: string;
  };
  caches: {
    checkpoints: ComfyUiResourceCacheEntry | null;
    loras: ComfyUiResourceCacheEntry | null;
    samplers: ComfyUiResourceCacheEntry | null;
    schedulers: ComfyUiResourceCacheEntry | null;
    upscaleModels: ComfyUiResourceCacheEntry | null;
  };
}

export function ComfyUiResourceStats({ labels, caches }: ComfyUiResourceStatsProps) {
  return (
    <div className={styles.resourceStats}>
      <ResourceStat label={labels.checkpoints} cache={caches.checkpoints} emptyLabel={labels.notLoaded} />
      <ResourceStat label={labels.loras} cache={caches.loras} emptyLabel={labels.notLoaded} />
      <ResourceStat label={labels.samplers} cache={caches.samplers} emptyLabel={labels.notLoaded} />
      <ResourceStat label={labels.schedulers} cache={caches.schedulers} emptyLabel={labels.notLoaded} />
      <ResourceStat label={labels.upscaleModels} cache={caches.upscaleModels} emptyLabel={labels.notLoaded} />
    </div>
  );
}
