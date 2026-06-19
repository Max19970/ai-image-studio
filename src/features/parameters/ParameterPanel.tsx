import { useEffect, useMemo, useRef, useState } from 'react';
import { capabilityOrder } from '../../domain/defaults';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { useI18n } from '../../i18n';
import { capabilityLabel, generationParamTabs, generationParamTabsById, getHiddenCapabilityKeys, getHiddenProviderParamDefinitions, getGenerationParamPrimaryLabelKey, renderGenerationParamSlot, type GenerationParamTab } from '../../entities/generation-params';
import styles from './ParameterPanel.module.css';

interface Props {
  mode: WorkMode;
  params: ImageParams;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  onChange: (params: ImageParams) => void;
}

const tabs = generationParamTabs.map((tab) => tab.id);

export function ParameterPanel({ mode, params, provider, capabilityReport, onChange }: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<GenerationParamTab>('frame');
  const tabRailRef = useRef<HTMLElement | null>(null);
  const patch = <K extends keyof ImageParams>(key: K, value: ImageParams[K]) => onChange({ ...params, [key]: value });

  const hiddenCapabilityParams = getHiddenCapabilityKeys({ mode, capabilityReport }, capabilityOrder);
  const hiddenProviderParams = getHiddenProviderParamDefinitions({ mode, params, provider, capabilityReport, patch });
  const hiddenParamsCount = hiddenCapabilityParams.length + hiddenProviderParams.length;

  const tabStats = useMemo<Record<GenerationParamTab, string>>(() => ({
    frame: params.sizeMode === 'custom' ? `${params.width}×${params.height}` : params.sizeMode === 'preset' ? params.sizePreset : 'auto',
    render: [params.quality || 'omit', params.background || 'omit'].join(' · '),
    output: `${params.outputFormat}${params.stream ? ' · stream' : ''}`,
    service: params.rawJson.trim() ? 'raw JSON' : 'payload',
    retry: params.retryAttempts > 0 ? `${params.retryAttempts}× / ${params.retryDelaySeconds}s` : t('params.retryOff')
  }), [params, t]);

  const fieldContext = useMemo(() => ({ mode, params, provider, capabilityReport, patch }), [mode, params, provider, capabilityReport]);
  const activeTabMeta = generationParamTabsById.get(activeTab) ?? generationParamTabs[0];
  const activeTabFields = renderGenerationParamSlot(activeTabMeta.slot, fieldContext);

  useEffect(() => {
    const rail = tabRailRef.current;
    if (!rail || window.matchMedia('(min-width: 641px)').matches) return;
    const active = rail.querySelector<HTMLElement>('[data-active=\"true\"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeTab]);

  return (
    <section className={styles.workbench}>
      <div className={`panel-heading ${styles.heading}`}>
        <span className="section-kicker">{t('params.controlRoom')}</span>
        <h2>{t('params.title')}</h2>
        <p>{hiddenParamsCount > 0 ? t('params.hiddenCount', { count: hiddenParamsCount }) : t('params.fullSet')}</p>
      </div>

      <aside ref={tabRailRef} className={styles.tabRail} aria-label={t('params.tabsAria')}>
        {tabs.map((tab) => (
          <button key={tab} type="button" className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ''}`.trim()} data-param-tab={tab} data-active={activeTab === tab ? 'true' : 'false'} onClick={() => setActiveTab(tab)}>
            <span className={styles.tabLabel}>{t((generationParamTabsById.get(tab) ?? generationParamTabs[0]).labelKey)}</span>
            <small className={styles.tabStat}>{tabStats[tab]}</small>
          </button>
        ))}
      </aside>

      <div className={styles.tabMain}>
        {hiddenParamsCount > 0 && (
          <div className={styles.infoStrip}>
            {hiddenCapabilityParams.length > 0 && <p>{t('params.hiddenList', { items: hiddenCapabilityParams.map((key) => capabilityLabel(key)).join(', ') })}</p>}
            {hiddenProviderParams.length > 0 && <p>{t('params.hiddenProviderList', { items: hiddenProviderParams.map((definition) => t(getGenerationParamPrimaryLabelKey(definition))).join(', ') })}</p>}
          </div>
        )}

        <section className={`inspector-group ${styles.tabPanel} ${activeTabMeta.panelClassKey ? styles[activeTabMeta.panelClassKey] : ''}`.trim()} data-param-slot={activeTabMeta.slot}>
          <header className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t(activeTabMeta.labelKey)}</h3>
            <p className={styles.panelHint}>{t(activeTabMeta.hintKey)}</p>
          </header>
          <div className={styles.fieldGrid}>
            {activeTabFields}
          </div>
        </section>
      </div>
    </section>
  );
}
