import { useCallback, useMemo } from 'react';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { useI18n } from '../../i18n';
import { capabilityLabel } from '../../entities/generation-params';
import { getProviderGenerationSurface } from '../../entities/generation-params/surfaceRegistry';
import { readProviderParamState, writeProviderParamState } from '../../entities/generation-params/providerState';
import type { ProviderParamState } from '../../entities/generation-params/surfaceTypes';
import { GroupedCollection, useMeasuredGroupedCollection } from '../../shared/ui';
import styles from './ParameterPanel.module.css';

interface Props {
  mode: WorkMode;
  providerMode: ProviderGenerationModeDefinition;
  params: ImageParams;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  studioSettings?: StudioSettings;
  onChange: (params: ImageParams) => void;
}

export function ParameterPanel({
  mode,
  providerMode,
  params,
  provider,
  capabilityReport,
  studioSettings,
  onChange
}: Props) {
  const { t } = useI18n();
  const surface = useMemo(() => getProviderGenerationSurface(provider), [provider]);
  const surfaceContext = useMemo(
    () => ({ mode, providerMode, params, provider, capabilityReport, studioSettings }),
    [mode, providerMode, params, provider, capabilityReport, studioSettings]
  );

  const patch = useCallback(<K extends keyof ImageParams,>(key: K, value: ImageParams[K]) => {
    onChange({ ...params, [key]: value });
  }, [onChange, params]);
  const setProviderParams = useCallback((next: ProviderParamState) => {
    onChange(writeProviderParamState(params, provider, surface.normalizeState(next, provider)));
  }, [onChange, params, provider, surface]);
  const patchProviderParam = useCallback((key: string, value: unknown) => {
    setProviderParams({
      ...readProviderParamState(params, provider, surface.getDefaultState(provider)),
      [key]: value
    });
  }, [params, provider, setProviderParams, surface]);

  const fieldContext = useMemo(() => ({
    ...surfaceContext,
    patch,
    setProviderParams,
    patchProviderParam
  }), [surfaceContext, patch, setProviderParams, patchProviderParam]);

  const sectionDefinitions = useMemo(
    () => surface.getTabs(surfaceContext),
    [surface, surfaceContext]
  );
  const sections = useMemo(
    () => sectionDefinitions
      .map((definition) => ({
        definition,
        fields: surface.renderSlot(definition.slot, fieldContext)
      }))
      .filter((section) => section.fields.length > 0),
    [fieldContext, sectionDefinitions, surface]
  );
  const sectionIds = useMemo(
    () => sections.map(({ definition }) => definition.id),
    [sections]
  );
  const sectionSummaries = useMemo(
    () => surface.getTabStats(surfaceContext, { retryOff: t('params.retryOff') }),
    [surface, surfaceContext, t]
  );
  const groupedNavigation = useMeasuredGroupedCollection(sectionIds, { scrollOffset: 18 });

  const hiddenSummary = surface.getHiddenSummary(fieldContext);
  const hiddenParamsCount = hiddenSummary.capabilityKeys.length + hiddenSummary.paramLabelKeys.length;

  return (
    <section className={styles.workbench} data-generation-surface={surface.id}>
      <GroupedCollection.Root className={styles.collection}>
        <GroupedCollection.Navigation
          className={styles.navigation}
          listClassName={styles.navigationList}
          label={t('params.tabsAria')}
        >
          {sections.map(({ definition }) => {
            const active = definition.id === groupedNavigation.activeGroupId;
            return (
              <GroupedCollection.NavigationItem
                key={definition.id}
                active={active}
                className={styles.navigationItem}
                aria-controls={`parameter-section-${definition.id}`}
                onClick={() => groupedNavigation.navigateToGroup(definition.id)}
              >
                <span className={styles.navigationCopy}>
                  <strong>{t(definition.labelKey)}</strong>
                  <small>{sectionSummaries[definition.id]}</small>
                </span>
              </GroupedCollection.NavigationItem>
            );
          })}
        </GroupedCollection.Navigation>

        <GroupedCollection.Content className={styles.content} label={t('params.title')}>
          <div
            ref={groupedNavigation.scrollerRef}
            className={styles.contentScroller}
            onScroll={groupedNavigation.scheduleActiveGroupUpdate}
          >
            {hiddenParamsCount > 0 && (
              <div className={styles.infoStrip}>
                {hiddenSummary.capabilityKeys.length > 0 && (
                  <p>{t('params.hiddenList', {
                    items: hiddenSummary.capabilityKeys.map((key) => capabilityLabel(key)).join(', ')
                  })}</p>
                )}
                {hiddenSummary.paramLabelKeys.length > 0 && (
                  <p>{t('params.hiddenProviderList', {
                    items: hiddenSummary.paramLabelKeys.map((key) => t(key)).join(', ')
                  })}</p>
                )}
              </div>
            )}

            {sections.length > 0 ? sections.map(({ definition, fields }) => (
              <section
                key={definition.id}
                ref={(element) => groupedNavigation.setGroupElement(definition.id, element)}
                id={`parameter-section-${definition.id}`}
                className={styles.section}
                aria-labelledby={`parameter-section-title-${definition.id}`}
                data-param-slot={definition.slot}
              >
                <header className={styles.sectionHeader}>
                  <h3 id={`parameter-section-title-${definition.id}`} className={styles.sectionTitle}>
                    {t(definition.labelKey)}
                  </h3>
                  <p className={styles.sectionHint}>{t(definition.hintKey)}</p>
                </header>
                <div className={styles.fieldList}>
                  {fields}
                </div>
              </section>
            )) : (
              <div className={styles.emptyState} role="status">
                <strong>{t('params.fullSet')}</strong>
              </div>
            )}
          </div>
        </GroupedCollection.Content>
      </GroupedCollection.Root>
    </section>
  );
}
