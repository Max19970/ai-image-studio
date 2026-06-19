import { useEffect, useMemo, useRef, useState } from 'react';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { useI18n } from '../../i18n';
import { capabilityLabel, type GenerationParamTab } from '../../entities/generation-params';
import { getProviderGenerationSurface } from '../../entities/generation-params/surfaceRegistry';
import { readProviderParamState, writeProviderParamState } from '../../entities/generation-params/providerState';
import type { ProviderParamState } from '../../entities/generation-params/surfaceTypes';
import styles from './ParameterPanel.module.css';

interface Props {
  mode: WorkMode;
  params: ImageParams;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  studioSettings?: StudioSettings;
  onChange: (params: ImageParams) => void;
}

export function ParameterPanel({ mode, params, provider, capabilityReport, studioSettings, onChange }: Props) {
  const { t } = useI18n();
  const surface = useMemo(() => getProviderGenerationSurface(provider), [provider]);
  const surfaceContext = useMemo(() => ({ mode, params, provider, capabilityReport, studioSettings }), [mode, params, provider, capabilityReport, studioSettings]);
  const surfaceTabs = useMemo(() => surface.getTabs(surfaceContext), [surface, surfaceContext]);
  const [activeTab, setActiveTab] = useState<GenerationParamTab>(() => surface.getInitialTab(surfaceContext));
  const tabRailRef = useRef<HTMLElement | null>(null);

  const patch = <K extends keyof ImageParams>(key: K, value: ImageParams[K]) => onChange({ ...params, [key]: value });
  const setProviderParams = (next: ProviderParamState) => onChange(writeProviderParamState(params, provider, surface.normalizeState(next, provider)));
  const patchProviderParam = (key: string, value: unknown) => {
    setProviderParams({
      ...readProviderParamState(params, provider, surface.getDefaultState(provider)),
      [key]: value
    });
  };

  const fieldContext = useMemo(() => ({
    ...surfaceContext,
    patch,
    setProviderParams,
    patchProviderParam
  }), [surfaceContext, patch, setProviderParams, patchProviderParam]);

  const hiddenSummary = surface.getHiddenSummary(fieldContext);
  const hiddenParamsCount = hiddenSummary.capabilityKeys.length + hiddenSummary.paramLabelKeys.length;

  const tabStats = useMemo(
    () => surface.getTabStats(surfaceContext, { retryOff: t('params.retryOff') }),
    [surface, surfaceContext, t]
  );

  useEffect(() => {
    if (surfaceTabs.some((tab) => tab.id === activeTab)) return;
    setActiveTab(surface.getInitialTab(surfaceContext));
  }, [activeTab, surface, surfaceContext, surfaceTabs]);

  const activeTabMeta = surfaceTabs.find((tab) => tab.id === activeTab) ?? surfaceTabs[0];
  const activeTabFields = activeTabMeta ? surface.renderSlot(activeTabMeta.slot, fieldContext) : [];

  useEffect(() => {
    const rail = tabRailRef.current;
    if (!rail || window.matchMedia('(min-width: 641px)').matches) return;
    const active = rail.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeTab]);

  return (
    <section className={styles.workbench} data-generation-surface={surface.id}>
      <div className={`panel-heading ${styles.heading}`}>
        <span className="section-kicker">{t('params.controlRoom')}</span>
        <h2>{t('params.title')}</h2>
        <p>{hiddenParamsCount > 0 ? t('params.hiddenCount', { count: hiddenParamsCount }) : t('params.fullSet')}</p>
      </div>

      <aside ref={tabRailRef} className={styles.tabRail} aria-label={t('params.tabsAria')}>
        {surfaceTabs.map((tab) => (
          <button key={tab.id} type="button" className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`.trim()} data-param-tab={tab.id} data-active={activeTab === tab.id ? 'true' : 'false'} onClick={() => setActiveTab(tab.id)}>
            <span className={styles.tabLabel}>{t(tab.labelKey)}</span>
            <small className={styles.tabStat}>{tabStats[tab.id]}</small>
          </button>
        ))}
      </aside>

      <div className={styles.tabMain}>
        {hiddenParamsCount > 0 && (
          <div className={styles.infoStrip}>
            {hiddenSummary.capabilityKeys.length > 0 && <p>{t('params.hiddenList', { items: hiddenSummary.capabilityKeys.map((key) => capabilityLabel(key)).join(', ') })}</p>}
            {hiddenSummary.paramLabelKeys.length > 0 && <p>{t('params.hiddenProviderList', { items: hiddenSummary.paramLabelKeys.map((key) => t(key)).join(', ') })}</p>}
          </div>
        )}

        {activeTabMeta && (
          <section className={`inspector-group ${styles.tabPanel} ${activeTabMeta.panelClassKey ? styles[activeTabMeta.panelClassKey] : ''}`.trim()} data-param-slot={activeTabMeta.slot}>
            <header className={styles.panelHead}>
              <h3 className={styles.panelTitle}>{t(activeTabMeta.labelKey)}</h3>
              <p className={styles.panelHint}>{t(activeTabMeta.hintKey)}</p>
            </header>
            <div className={styles.fieldGrid}>
              {activeTabFields}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
