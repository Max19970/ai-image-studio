import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultGenerationProvider } from '../domain/defaults';
import type { GenerationModel, GenerationProvider, InterfaceTheme, ProviderProbeReport, ProviderQuickCheckResult, StudioSettings } from '../domain/types';
import { locales, useI18n, type Locale } from '../i18n';
import { PopoverSelect } from './PopoverSelect';
import { FloatingPopover } from './FloatingPopover';

interface Props {
  settings: StudioSettings;
  report: ProviderProbeReport | null;
  probingProviderId: string | null;
  quickCheckingProviderId: string | null;
  quickCheckResults: Record<string, ProviderQuickCheckResult>;
  probeError: string | null;
  onSave: (settings: StudioSettings) => void;
  onSelectModel: (modelId: string) => void;
  onProbeProvider: (provider: GenerationProvider, model: GenerationModel | null) => void;
  onQuickCheckProvider: (provider: GenerationProvider, model: GenerationModel | null) => void;
  onClearCache: (provider: GenerationProvider, model: GenerationModel | null) => void;
}

type SettingsTab = 'interface' | 'generationApi';
type ApiFocus = 'providers' | 'models';

const interfaceThemes: InterfaceTheme[] = ['glass', 'midnight', 'ember', 'meadow', 'mono'];

const themePreviewMeta: Record<InterfaceTheme, { accent: string; font: string }> = {
  glass: { accent: '#f7f7f2', font: 'Inter' },
  midnight: { accent: '#9db7ff', font: 'Inter' },
  ember: { accent: '#ffb26b', font: 'Inter' },
  meadow: { accent: '#a7e4c3', font: 'Inter' },
  mono: { accent: '#d9d6c8', font: 'IBM Plex Mono' }
};

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeProvider(): GenerationProvider {
  return {
    ...defaultGenerationProvider,
    id: uid('provider'),
    name: 'New provider',
    apiKey: '',
    persistApiKey: false
  };
}

function makeModel(providerId: string): GenerationModel {
  return {
    id: uid('model'),
    name: 'New model',
    providerId,
    modelId: 'model-id',
    notes: ''
  };
}

function firstModelForProvider(settings: StudioSettings, providerId: string): GenerationModel | null {
  return settings.models.find((model) => model.providerId === providerId) ?? null;
}

function ProbeState({ report, probing, error }: { report: ProviderProbeReport | null; probing: boolean; error: string | null }) {
  const { t } = useI18n();

  if (probing) return <div className="info-strip">{t('settings.probeRunning')}</div>;
  if (error) return <div className="error-strip">{error}</div>;
  if (!report) return <div className="info-strip">{t('settings.probeEmpty')}</div>;

  const acceptedGenerate = Object.values(report.generation).filter((entry) => entry?.supported).length;
  const acceptedEdit = Object.values(report.edit).filter((entry) => entry?.supported).length;

  return (
    <div className="probe-state ok">
      <div className="font-medium">{t('settings.probeFound')}</div>
      <div className="mt-1">
        {t('settings.probeStats', {
          date: new Date(report.createdAt).toLocaleString(),
          generation: acceptedGenerate,
          edit: acceptedEdit
        })}
      </div>
      {report.caveat && <div className="mt-2">{report.caveat}</div>}
    </div>
  );
}

function InfoTip({ id, text, activeId, onToggle }: { id: string; text: string; activeId: string | null; onToggle: (id: string | null) => void }) {
  const { t } = useI18n();
  const active = activeId === id;
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <span className="settings-info-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`settings-info-button ${active ? 'active' : ''}`}
        aria-label={t('settings.infoButton')}
        aria-expanded={active}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(active ? null : id);
        }}
      >
        i
      </button>
      <FloatingPopover
        open={active}
        anchorRef={buttonRef}
        className="settings-info-popover settings-info-popover-floating"
        placement="auto"
        offset={8}
        minWidth={220}
        onDismiss={() => onToggle(null)}
      >
        {text}
      </FloatingPopover>
    </span>
  );
}

function FieldShell({ id, label, info, activeInfo, setActiveInfo, children, wide = false }: { id: string; label: string; info: string; activeInfo: string | null; setActiveInfo: (id: string | null) => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`settings-field ${wide ? 'wide' : ''}`}>
      <div className="settings-field-head">
        <span className="field-label">{label}</span>
        <InfoTip id={id} text={info} activeId={activeInfo} onToggle={setActiveInfo} />
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="settings-empty-card">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export function SettingsPage({
  settings,
  report,
  probingProviderId,
  quickCheckingProviderId,
  quickCheckResults,
  probeError,
  onSave,
  onSelectModel,
  onProbeProvider,
  onQuickCheckProvider,
  onClearCache
}: Props) {
  const { locale, setLocale, t } = useI18n();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>('generationApi');
  const [apiFocus, setApiFocus] = useState<ApiFocus>('providers');
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => {
    const selectedModel = settings.models.find((model) => model.id === settings.selectedModelId) ?? settings.models[0];
    return selectedModel?.providerId ?? settings.providers[0]?.id ?? '';
  });
  const [selectedModelId, setSelectedModelId] = useState<string>(() => settings.selectedModelId || settings.models[0]?.id || '');

  useEffect(() => {
    setDraft(settings);
    setSelectedModelId(settings.selectedModelId || settings.models[0]?.id || '');
    const selectedModel = settings.models.find((model) => model.id === settings.selectedModelId) ?? settings.models[0];
    setSelectedProviderId(selectedModel?.providerId ?? settings.providers[0]?.id ?? '');
  }, [settings]);

  const selectedProvider = useMemo(
    () => draft.providers.find((provider) => provider.id === selectedProviderId) ?? draft.providers[0] ?? null,
    [draft.providers, selectedProviderId]
  );
  const selectedModel = useMemo(
    () => draft.models.find((model) => model.id === selectedModelId) ?? draft.models[0] ?? null,
    [draft.models, selectedModelId]
  );
  const modelsForSelectedProvider = useMemo(
    () => selectedProvider ? draft.models.filter((model) => model.providerId === selectedProvider.id) : [],
    [draft.models, selectedProvider]
  );

  const patchProvider = <K extends keyof GenerationProvider>(key: K, value: GenerationProvider[K]) => {
    if (!selectedProvider) return;
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      providers: prev.providers.map((provider) => provider.id === selectedProvider.id ? { ...provider, [key]: value } : provider)
    }));
  };

  const patchModel = <K extends keyof GenerationModel>(key: K, value: GenerationModel[K]) => {
    if (!selectedModel) return;
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      models: prev.models.map((model) => model.id === selectedModel.id ? { ...model, [key]: value } : model),
      selectedModelId: selectedModel.id
    }));
  };

  const addProvider = () => {
    const provider = makeProvider();
    const model = makeModel(provider.id);
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      providers: [...prev.providers, provider],
      models: [...prev.models, model],
      selectedModelId: model.id
    }));
    setSelectedProviderId(provider.id);
    setSelectedModelId(model.id);
    setApiFocus('providers');
  };

  const removeProvider = () => {
    if (!selectedProvider || draft.providers.length <= 1) return;
    setSaved(false);
    setDraft((prev) => {
      const providers = prev.providers.filter((provider) => provider.id !== selectedProvider.id);
      const models = prev.models.filter((model) => model.providerId !== selectedProvider.id);
      const selected = models[0]?.id ?? '';
      setSelectedProviderId(providers[0]?.id ?? '');
      setSelectedModelId(selected);
      return { ...prev, providers, models, selectedModelId: selected };
    });
  };

  const addModel = () => {
    const providerId = selectedProvider?.id ?? draft.providers[0]?.id;
    if (!providerId) return;
    const model = makeModel(providerId);
    setSaved(false);
    setDraft((prev) => ({ ...prev, models: [...prev.models, model], selectedModelId: model.id }));
    setSelectedModelId(model.id);
    setApiFocus('models');
  };

  const removeModel = () => {
    if (!selectedModel || draft.models.length <= 1) return;
    setSaved(false);
    setDraft((prev) => {
      const models = prev.models.filter((model) => model.id !== selectedModel.id);
      const selected = models[0]?.id ?? '';
      setSelectedModelId(selected);
      return { ...prev, models, selectedModelId: selected };
    });
  };

  const resetDraft = () => {
    setDraft(settings);
    setSelectedModelId(settings.selectedModelId || settings.models[0]?.id || '');
    const selectedModel = settings.models.find((model) => model.id === settings.selectedModelId) ?? settings.models[0];
    setSelectedProviderId(selectedModel?.providerId ?? settings.providers[0]?.id ?? '');
    setSaved(false);
    setActiveInfo(null);
  };

  const selectTheme = (theme: InterfaceTheme) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, interfaceTheme: theme }));
  };

  const save = () => {
    const safeSelected = draft.models.some((model) => model.id === selectedModelId) ? selectedModelId : draft.models[0]?.id ?? '';
    const next = { ...draft, selectedModelId: safeSelected };
    onSave(next);
    onSelectModel(safeSelected);
    setSaved(true);
  };

  const selectModel = (model: GenerationModel) => {
    setSelectedModelId(model.id);
    setSelectedProviderId(model.providerId);
    setDraft((prev) => ({ ...prev, selectedModelId: model.id }));
    setSaved(false);
  };

  const probeModel = selectedProvider ? (selectedModel?.providerId === selectedProvider.id ? selectedModel : firstModelForProvider(draft, selectedProvider.id)) : null;
  const quickResult = selectedProvider ? quickCheckResults[selectedProvider.id] : null;
  const showReport = selectedProvider && selectedModel?.providerId === selectedProvider.id && selectedModel.id === settings.selectedModelId ? report : null;

  const providerOptions = draft.providers.map((provider) => ({
    value: provider.id,
    label: provider.name,
    description: provider.generationEndpoint || t('detail.notSet')
  }));
  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const activeTheme = draft.interfaceTheme ?? 'glass';

  return (
    <section className="workspace-settings-page settings-workbench" onClick={() => setActiveInfo(null)}>
      <header className="settings-page-heading settings-page-heading-flat">
        <p className="section-kicker">{t('settings.kicker')}</p>
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.subtitle')}</p>
      </header>

      <div className="settings-save-bar glass-panel" onClick={(event) => event.stopPropagation()}>
        <div>
          <span className="section-kicker">{t('settings.actions')}</span>
          <strong>{saved ? t('settings.saved') : isDirty ? t('settings.unsaved') : t('settings.noChanges')}</strong>
        </div>
        <div className="settings-save-actions">
          <button className="btn-secondary" onClick={resetDraft} disabled={!isDirty}>{t('settings.cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={!isDirty}>{t('settings.save')}</button>
        </div>
      </div>

      <div className="settings-tabbed-shell glass-panel" onClick={(event) => event.stopPropagation()}>
        <aside className="settings-tab-rail" aria-label={t('settings.tabsAria')}>
          <button type="button" className={tab === 'interface' ? 'active' : ''} onClick={() => setTab('interface')}>
            <span>{t('settings.tab.interface')}</span>
            <small>{t('settings.tab.interfaceHint')}</small>
          </button>
          <button type="button" className={tab === 'generationApi' ? 'active' : ''} onClick={() => setTab('generationApi')}>
            <span>{t('settings.tab.generationApi')}</span>
            <small>{t('settings.tab.generationApiHint')}</small>
          </button>
        </aside>

        <section className="settings-tab-page">
          {tab === 'interface' && (
            <div className="settings-subpage settings-subpage-interface">
              <div className="settings-page-heading">
                <p className="section-kicker">{t('settings.tab.interface')}</p>
                <h3>{t('settings.interfaceTitle')}</h3>
                <p>{t('settings.interfaceText')}</p>
              </div>

              <div className="settings-language-card redesigned">
                <div>
                  <p className="section-kicker">{t('settings.languageTitle')}</p>
                  <p>{t('settings.languageHint')}</p>
                </div>
                <FieldShell id="language" label={t('settings.languageLabel')} info={t('settings.info.language')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                  <PopoverSelect
                    value={locale}
                    onChange={(value) => setLocale(value as Locale)}
                    options={locales.map((item) => ({ value: item.value, label: item.nativeLabel, description: item.label }))}
                    ariaLabel={t('settings.languageLabel')}
                    className="settings-inline-select"
                    triggerClassName="settings-select-trigger"
                    panelClassName="settings-select-panel"
                    showSelectedDescription
                  />
                </FieldShell>
              </div>

              <div className="settings-theme-card">
                <div className="settings-theme-head">
                  <div>
                    <p className="section-kicker">{t('settings.themeTitle')}</p>
                    <h4>{t('settings.themeHeading')}</h4>
                    <p>{t('settings.themeHint')}</p>
                  </div>
                  <InfoTip id="interfaceTheme" text={t('settings.info.theme')} activeId={activeInfo} onToggle={setActiveInfo} />
                </div>

                <div className="settings-theme-grid" role="radiogroup" aria-label={t('settings.themeTitle')}>
                  {interfaceThemes.map((theme) => (
                    <button
                      type="button"
                      key={theme}
                      role="radio"
                      aria-checked={activeTheme === theme}
                      className={`theme-choice theme-choice-${theme} ${activeTheme === theme ? 'active' : ''}`}
                      onClick={() => selectTheme(theme)}
                    >
                      <span className={`theme-preview theme-preview-${theme}`} aria-hidden="true">
                        <span className="theme-preview-sidebar" />
                        <span className="theme-preview-canvas">
                          <i className="theme-preview-line strong" />
                          <i className="theme-preview-line" />
                          <i className="theme-preview-button" />
                        </span>
                      </span>
                      <span className="theme-choice-copy">
                        <strong>{t(`settings.theme.${theme}.title`)}</strong>
                        <span>{t(`settings.theme.${theme}.description`)}</span>
                      </span>
                      <span className="theme-choice-meta">
                        <span><i className={`theme-accent-dot theme-accent-${theme}`} />{themePreviewMeta[theme].accent}</span>
                        <span>{themePreviewMeta[theme].font}</span>
                        <span>{t(`settings.theme.${theme}.tone`)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'generationApi' && (
            <div className="settings-subpage">
              <div className="settings-page-heading">
                <p className="section-kicker">{t('settings.tab.generationApi')}</p>
                <h3>{t('settings.apiTitle')}</h3>
                <p>{t('settings.apiText')}</p>
              </div>

              <div className="api-focus-switch" role="tablist" aria-label={t('settings.apiTitle')}>
                <button type="button" className={apiFocus === 'providers' ? 'active' : ''} onClick={() => setApiFocus('providers')}>{t('settings.providers')}</button>
                <button type="button" className={apiFocus === 'models' ? 'active' : ''} onClick={() => setApiFocus('models')}>{t('settings.models')}</button>
              </div>

              {apiFocus === 'providers' && (
                <div className="api-focus-layout">
                  <section className="api-list-panel">
                    <div className="api-column-head">
                      <div>
                        <h4>{t('settings.providers')}</h4>
                        <p>{t('settings.providersHint')}</p>
                      </div>
                      <button type="button" className="btn-secondary" onClick={addProvider}>+ {t('settings.addProvider')}</button>
                    </div>

                    <div className="entity-list api-entity-list">
                      {draft.providers.map((provider) => {
                        const relatedModels = draft.models.filter((model) => model.providerId === provider.id).length;
                        return (
                          <button
                            type="button"
                            key={provider.id}
                            className={`entity-card ${provider.id === selectedProvider?.id ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedProviderId(provider.id);
                              const model = firstModelForProvider(draft, provider.id);
                              if (model) setSelectedModelId(model.id);
                            }}
                          >
                            <strong>{provider.name || t('settings.unnamedProvider')}</strong>
                            <span>{provider.generationEndpoint || t('detail.notSet')}</span>
                            <small>{t('settings.modelsCount', { count: relatedModels })}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="api-inspector-panel">
                    {selectedProvider ? (
                      <>
                        <div className="entity-editor provider-editor">
                          <div className="entity-editor-head">
                            <strong>{t('settings.providerEditor')}</strong>
                            <button type="button" className="btn-secondary danger-soft" onClick={removeProvider} disabled={draft.providers.length <= 1}>{t('settings.deleteProvider')}</button>
                          </div>

                          <div className="settings-field-grid">
                            <FieldShell id="providerName" label={t('settings.providerName')} info={t('settings.info.providerName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                              <input className="field-input" value={selectedProvider.name} onChange={(e) => patchProvider('name', e.target.value)} />
                            </FieldShell>
                            <FieldShell id="timeout" label={t('settings.timeout')} info={t('settings.info.timeout')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                              <input className="field-input" type="number" min={1000} max={900000} value={selectedProvider.timeoutMs} onChange={(e) => patchProvider('timeoutMs', Number(e.target.value))} />
                            </FieldShell>
                            <FieldShell id="generationEndpoint" label={t('settings.generationEndpoint')} info={t('settings.info.generationEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <input className="field-input" value={selectedProvider.generationEndpoint} onChange={(e) => patchProvider('generationEndpoint', e.target.value)} />
                            </FieldShell>
                            <FieldShell id="editEndpoint" label={t('settings.editEndpoint')} info={t('settings.info.editEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <input className="field-input" value={selectedProvider.editEndpoint} onChange={(e) => patchProvider('editEndpoint', e.target.value)} />
                            </FieldShell>
                            <FieldShell id="responsesEndpoint" label={t('settings.responsesEndpoint')} info={t('settings.info.responsesEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <input className="field-input" value={selectedProvider.responsesEndpoint} onChange={(e) => patchProvider('responsesEndpoint', e.target.value)} />
                            </FieldShell>
                            <FieldShell id="apiKey" label={t('settings.apiKey')} info={t('settings.info.apiKey')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <input className="field-input" type="password" value={selectedProvider.apiKey} onChange={(e) => patchProvider('apiKey', e.target.value)} placeholder="sk-..." autoComplete="off" />
                            </FieldShell>
                            <FieldShell id="authHeader" label={t('settings.authHeader')} info={t('settings.info.authHeader')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                              <input className="field-input" value={selectedProvider.authHeaderName} onChange={(e) => patchProvider('authHeaderName', e.target.value)} placeholder="Authorization" />
                            </FieldShell>
                            <FieldShell id="authScheme" label={t('settings.authScheme')} info={t('settings.info.authScheme')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                              <input className="field-input" value={selectedProvider.authScheme} onChange={(e) => patchProvider('authScheme', e.target.value)} placeholder="Bearer" />
                            </FieldShell>
                            <FieldShell id="customHeaders" label={t('settings.customHeaders')} info={t('settings.info.customHeaders')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <textarea className="field-input min-h-[110px]" value={selectedProvider.customHeadersJson} onChange={(e) => patchProvider('customHeadersJson', e.target.value)} placeholder={'{ "OpenAI-Organization": "org_..." }'} />
                            </FieldShell>
                            <div className="settings-check-card wide">
                              <label className="inline-check">
                                <input type="checkbox" className="h-4 w-4 rounded" checked={selectedProvider.persistApiKey} onChange={(e) => patchProvider('persistApiKey', e.target.checked)} />
                                <span>{t('settings.persistApiKey')}</span>
                              </label>
                              <InfoTip id="persistApiKey" text={t('settings.info.persistApiKey')} activeId={activeInfo} onToggle={setActiveInfo} />
                            </div>
                          </div>
                        </div>

                        <div className="provider-check-card">
                          <div>
                            <strong>{t('settings.providerChecks')}</strong>
                            <p>{t('settings.providerChecksHint', { model: probeModel?.modelId ?? t('info.noModel') })}</p>
                          </div>
                          <div className="settings-probe-actions">
                            <button className="btn-secondary" onClick={() => onQuickCheckProvider(selectedProvider, probeModel)} disabled={quickCheckingProviderId === selectedProvider.id}>
                              {quickCheckingProviderId === selectedProvider.id ? t('settings.quickChecking') : t('settings.quickCheck')}
                            </button>
                            <button className="btn-primary" onClick={() => onProbeProvider(selectedProvider, probeModel)} disabled={probingProviderId === selectedProvider.id}>
                              {probingProviderId === selectedProvider.id ? t('settings.probeRunningShort') : t('settings.probeButtonShort')}
                            </button>
                            <button className="btn-secondary" onClick={() => onClearCache(selectedProvider, probeModel)}>{t('settings.clearProbe')}</button>
                          </div>
                          {quickResult && (
                            <div className={`quick-check-result ${quickResult.ok ? 'ok' : 'bad'}`}>
                              <strong>{quickResult.ok ? t('settings.quickOk') : t('settings.quickBad')}</strong>
                              <span>{quickResult.status ? `HTTP ${quickResult.status} · ` : ''}{quickResult.message}</span>
                            </div>
                          )}
                          <ProbeState report={showReport} probing={probingProviderId === selectedProvider.id} error={probeError} />
                        </div>
                      </>
                    ) : (
                      <EmptyState title={t('settings.noProviders')} text={t('settings.noProvidersText')} />
                    )}
                  </section>
                </div>
              )}

              {apiFocus === 'models' && (
                <div className="api-focus-layout">
                  <section className="api-list-panel">
                    <div className="api-column-head">
                      <div>
                        <h4>{t('settings.models')}</h4>
                        <p>{t('settings.modelsHint')}</p>
                      </div>
                      <button type="button" className="btn-secondary" onClick={addModel}>+ {t('settings.addModel')}</button>
                    </div>

                    <div className="entity-list api-entity-list models-list">
                      {draft.models.map((model) => {
                        const provider = draft.providers.find((item) => item.id === model.providerId);
                        return (
                          <button
                            type="button"
                            key={model.id}
                            className={`entity-card ${model.id === selectedModel?.id ? 'active' : ''}`}
                            onClick={() => selectModel(model)}
                          >
                            <strong>{model.name || model.modelId}</strong>
                            <span>{model.modelId}</span>
                            <small>{provider?.name ?? t('detail.notSet')}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="api-inspector-panel">
                    {selectedModel ? (
                      <>
                        <div className="entity-editor model-editor">
                          <div className="entity-editor-head">
                            <strong>{t('settings.modelEditor')}</strong>
                            <button type="button" className="btn-secondary danger-soft" onClick={removeModel} disabled={draft.models.length <= 1}>{t('settings.deleteModel')}</button>
                          </div>

                          <div className="settings-field-grid">
                            <FieldShell id="modelName" label={t('settings.modelName')} info={t('settings.info.modelName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                              <input className="field-input" value={selectedModel.name} onChange={(e) => patchModel('name', e.target.value)} />
                            </FieldShell>
                            <FieldShell id="modelId" label={t('settings.modelId')} info={t('settings.info.modelId')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                              <input className="field-input" value={selectedModel.modelId} onChange={(e) => patchModel('modelId', e.target.value)} placeholder="gpt-image-2" />
                            </FieldShell>
                            <FieldShell id="modelProvider" label={t('settings.modelProvider')} info={t('settings.info.modelProvider')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <PopoverSelect
                                value={selectedModel.providerId}
                                onChange={(value) => {
                                  patchModel('providerId', value);
                                  setSelectedProviderId(value);
                                }}
                                options={providerOptions}
                                ariaLabel={t('settings.modelProvider')}
                                className="settings-inline-select"
                                triggerClassName="settings-select-trigger"
                                panelClassName="settings-select-panel"
                                showSelectedDescription
                              />
                            </FieldShell>
                            <FieldShell id="modelNotes" label={t('settings.modelNotes')} info={t('settings.info.modelNotes')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                              <textarea className="field-input min-h-[92px]" value={selectedModel.notes} onChange={(e) => patchModel('notes', e.target.value)} />
                            </FieldShell>
                          </div>
                        </div>

                        <div className="active-model-card">
                          <div>
                            <span className="section-kicker">{t('settings.activeModel')}</span>
                            <strong>{selectedModel.name || selectedModel.modelId}</strong>
                            <p>{t('settings.activeModelHint')}</p>
                          </div>
                          <button type="button" className="btn-primary" onClick={() => selectModel(selectedModel)}>{t('settings.useModel')}</button>
                        </div>

                        {selectedProvider && modelsForSelectedProvider.length > 0 && (
                          <div className="settings-empty-card">
                            <strong>{selectedProvider.name}</strong>
                            <span>{t('settings.modelsCount', { count: modelsForSelectedProvider.length })}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState title={t('settings.noModels')} text={t('settings.noModelsText')} />
                    )}
                  </section>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

    </section>
  );
}
