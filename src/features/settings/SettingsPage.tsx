import { useEffect, useMemo, useState } from 'react';
import { normalizeMaxStoredGenerationTasks } from '../../domain/generationHistorySettings';
import type { InterfaceTheme, StudioSettings } from '../../domain/studioSettings';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { SettingsCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { SlotHost } from '../../interface/SlotHost';
import { resolveSafeSelectedModelId } from './model/settingsDraftSelection';
import { useGenerationApiSettingsDraft } from './sections/generation-api/useGenerationApiSettingsDraft';
import { createSettingsSectionContext } from './createSettingsSectionContext';
import type { SettingsLayoutContext, SettingsTab } from './settingsTypes';
import './mobileSettingsPrimitives.css';
import styles from './SettingsPage.module.css';

interface Props {
  settings: StudioSettings;
  report: ProviderProbeReport | null;
  probingProviderId: string | null;
  quickCheckingProviderId: string | null;
  quickCheckResults: Record<string, ProviderQuickCheckResult>;
  probeError: string | null;
  commands: SettingsCommands;
}

export function SettingsPage({
  settings,
  report,
  probingProviderId,
  quickCheckingProviderId,
  quickCheckResults,
  probeError,
  commands
}: Props) {
  const { locale, setLocale, t } = useI18n();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>('generationApi');

  const markDirty = () => setSaved(false);
  const generationApi = useGenerationApiSettingsDraft({
    settings,
    draft,
    setDraft,
    markDirty,
    report,
    quickCheckResults,
    notSetLabel: t('detail.notSet')
  });

  const resetDraft = () => {
    setDraft(settings);
    generationApi.resetSelectionFrom(settings);
    setSaved(false);
    setActiveInfo(null);
  };

  const selectTheme = (theme: InterfaceTheme) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, interfaceTheme: theme }));
  };

  const setMaxStoredGenerationTasks = (value: number) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, maxStoredGenerationTasks: normalizeMaxStoredGenerationTasks(value, prev.maxStoredGenerationTasks) }));
  };

  const save = () => {
    const safeSelected = resolveSafeSelectedModelId(draft, generationApi.selectedModelId);
    const next = { ...draft, selectedModelId: safeSelected };
    commands.save(next);
    commands.selectModel(safeSelected);
    setSaved(true);
  };

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  useEffect(() => {
    if (!saved || isDirty) return undefined;
    const timeout = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [isDirty, saved]);

  const activeTheme = draft.interfaceTheme ?? 'glass';

  const sectionContext = createSettingsSectionContext({
    activeTab: tab,
    locale,
    setLocale,
    activeInfo,
    setActiveInfo,
    activeTheme,
    selectTheme,
    maxStoredGenerationTasks: draft.maxStoredGenerationTasks,
    setMaxStoredGenerationTasks,
    draft,
    generationApi,
    probingProviderId,
    quickCheckingProviderId,
    probeError,
    commands
  });

  const layoutContext: SettingsLayoutContext = {
    activeTab: tab,
    setActiveTab: setTab,
    saved,
    isDirty,
    onReset: resetDraft,
    onSave: save,
    sectionContext
  };

  return (
    <section className={`workspace-settings-page ${styles.workbench}`} data-testid="settings-page" onClick={() => setActiveInfo(null)}>
      <SlotHost<SettingsLayoutContext> slot="settings/layout" context={layoutContext} as={null} />
    </section>
  );
}
