import { useMemo, useState, type ReactNode } from 'react';
import { capabilityLabels, capabilityOrder, sizePresets } from '../domain/defaults';
import type { CapabilityKey, ImageParams, ProviderProbeReport, WorkMode } from '../domain/types';
import { validateCustomSize } from '../domain/requestBuilder';
import { useI18n } from '../i18n';
import { PopoverSelect } from './PopoverSelect';

interface Props {
  mode: WorkMode;
  params: ImageParams;
  capabilityReport: ProviderProbeReport | null;
  onChange: (params: ImageParams) => void;
}

type ParameterTab = 'frame' | 'render' | 'output' | 'service' | 'retry';

function ParamToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <label className="send-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{t('params.send')}</span>
    </label>
  );
}

function supported(report: ProviderProbeReport | null, mode: WorkMode, key: CapabilityKey): boolean {
  const bucket = mode === 'generate' ? report?.generation : report?.edit;
  const entry = bucket?.[key];
  return !entry || entry.supported !== false;
}

function Field({ label, children, toggle }: { label: string; children: ReactNode; toggle?: React.ReactNode }) {
  return (
    <div className="control-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="field-label">{label}</label>
        {toggle}
      </div>
      {children}
    </div>
  );
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function ParameterPanel({ mode, params, capabilityReport, onChange }: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ParameterTab>('frame');
  const patch = <K extends keyof ImageParams>(key: K, value: ImageParams[K]) => onChange({ ...params, [key]: value });
  const customErrors = params.sizeMode === 'custom' ? validateCustomSize(params.width, params.height) : [];

  const hiddenParams = capabilityOrder.filter((key) => {
    if (mode === 'generate' && key === 'input_fidelity') return false;
    return !supported(capabilityReport, mode, key);
  });

  const tabStats = useMemo<Record<ParameterTab, string>>(() => ({
    frame: params.sizeMode === 'custom' ? `${params.width}×${params.height}` : params.sizeMode === 'preset' ? params.sizePreset : 'auto',
    render: [params.quality || 'omit', params.background || 'omit'].join(' · '),
    output: `${params.outputFormat}${params.stream ? ' · stream' : ''}`,
    service: params.rawJson.trim() ? 'raw JSON' : 'payload',
    retry: params.retryAttempts > 0 ? `${params.retryAttempts}× / ${params.retryDelaySeconds}s` : t('params.retryOff')
  }), [params, t]);

  const tabs: { id: ParameterTab; label: string; hint: string }[] = [
    { id: 'frame', label: t('params.frame'), hint: tabStats.frame },
    { id: 'render', label: t('params.render'), hint: tabStats.render },
    { id: 'output', label: t('params.formatStreaming'), hint: tabStats.output },
    { id: 'service', label: t('params.service'), hint: tabStats.service },
    { id: 'retry', label: t('params.retry'), hint: tabStats.retry }
  ];

  return (
    <section className="panel-stack parameter-workbench">
      <div className="panel-heading">
        <span className="section-kicker">{t('params.controlRoom')}</span>
        <h2>{t('params.title')}</h2>
        <p>{capabilityReport ? t('params.hiddenCount', { count: hiddenParams.length }) : t('params.fullSet')}</p>
      </div>

      <aside className="parameter-tab-rail" aria-label={t('params.tabsAria')}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            <span>{tab.label}</span>
            <small>{tab.hint}</small>
          </button>
        ))}
      </aside>

      <div className="parameter-tab-main">
        {hiddenParams.length > 0 && (
          <div className="info-strip compact">
            {t('params.hiddenList', { items: hiddenParams.map((key) => capabilityLabels[key]).join(', ') })}
          </div>
        )}

        {activeTab === 'frame' && (
          <section className="inspector-group parameter-tab-panel">
            <header className="parameter-panel-head">
              <summary>{t('params.frame')}</summary>
              <p>{t('params.frameHint')}</p>
            </header>
            <div className="inspector-grid">
              <Field label={t('params.sizeMode')}>
                <PopoverSelect
                  value={params.sizeMode}
                  onChange={(value) => patch('sizeMode', value as ImageParams['sizeMode'])}
                  options={[
                    { value: 'auto', label: t('params.option.auto') },
                    { value: 'preset', label: t('params.option.preset') },
                    { value: 'custom', label: t('params.option.custom') }
                  ]}
                  ariaLabel={t('params.sizeMode')}
                  className="field-select"
                  triggerClassName="field-select-trigger"
                  panelClassName="field-select-panel"
                />
              </Field>

              {params.sizeMode === 'preset' && (
                <Field label={t('params.preset')}>
                  <PopoverSelect
                    value={params.sizePreset}
                    onChange={(value) => patch('sizePreset', value)}
                    options={sizePresets.map((preset) => ({ value: preset, label: preset }))}
                    ariaLabel={t('params.preset')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {params.sizeMode === 'custom' && (
                <>
                  <Field label={t('params.width')}>
                    <input className="field-input" type="number" step={16} value={params.width} onChange={(e) => patch('width', Number(e.target.value))} />
                  </Field>
                  <Field label={t('params.height')}>
                    <input className="field-input" type="number" step={16} value={params.height} onChange={(e) => patch('height', Number(e.target.value))} />
                  </Field>
                </>
              )}

              {supported(capabilityReport, mode, 'n') && (
                <Field label="n" toggle={<ParamToggle checked={params.includeN} onChange={(v) => patch('includeN', v)} />}>
                  <input className="field-input" type="number" min={1} max={10} value={params.n} onChange={(e) => patch('n', Number(e.target.value))} />
                </Field>
              )}
            </div>
            {customErrors.length > 0 && <div className="warning-strip compact mt-3">{customErrors.map((e) => <p key={e}>{e}</p>)}</div>}
          </section>
        )}

        {activeTab === 'render' && (
          <section className="inspector-group parameter-tab-panel">
            <header className="parameter-panel-head">
              <summary>{t('params.render')}</summary>
              <p>{t('params.renderHint')}</p>
            </header>
            <div className="inspector-grid">
              {supported(capabilityReport, mode, 'quality') && (
                <Field label={t('params.quality')} toggle={<ParamToggle checked={params.includeQuality} onChange={(v) => patch('includeQuality', v)} />}>
                  <PopoverSelect
                    value={params.quality}
                    onChange={(value) => patch('quality', value as ImageParams['quality'])}
                    options={[
                      { value: '', label: t('params.option.omit') },
                      { value: 'auto', label: 'auto' },
                      { value: 'low', label: 'low' },
                      { value: 'medium', label: 'medium' },
                      { value: 'high', label: 'high' },
                      { value: 'standard', label: 'standard' },
                      { value: 'hd', label: 'hd' }
                    ]}
                    ariaLabel={t('params.quality')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {supported(capabilityReport, mode, 'background') && (
                <Field label={t('params.background')} toggle={<ParamToggle checked={params.includeBackground} onChange={(v) => patch('includeBackground', v)} />}>
                  <PopoverSelect
                    value={params.background}
                    onChange={(value) => patch('background', value as ImageParams['background'])}
                    options={[
                      { value: '', label: t('params.option.omit') },
                      { value: 'auto', label: 'auto' },
                      { value: 'opaque', label: 'opaque' },
                      { value: 'transparent', label: 'transparent' }
                    ]}
                    ariaLabel={t('params.background')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {supported(capabilityReport, mode, 'moderation') && (
                <Field label={t('params.moderation')} toggle={<ParamToggle checked={params.includeModeration} onChange={(v) => patch('includeModeration', v)} />}>
                  <PopoverSelect
                    value={params.moderation}
                    onChange={(value) => patch('moderation', value as ImageParams['moderation'])}
                    options={[
                      { value: '', label: t('params.option.omit') },
                      { value: 'auto', label: 'auto' },
                      { value: 'low', label: 'low' }
                    ]}
                    ariaLabel={t('params.moderation')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {supported(capabilityReport, mode, 'style') && (
                <Field label={t('params.style')} toggle={<ParamToggle checked={params.includeStyle} onChange={(v) => patch('includeStyle', v)} />}>
                  <PopoverSelect
                    value={params.style}
                    onChange={(value) => patch('style', value as ImageParams['style'])}
                    options={[
                      { value: '', label: t('params.option.omit') },
                      { value: 'vivid', label: 'vivid' },
                      { value: 'natural', label: 'natural' }
                    ]}
                    ariaLabel={t('params.style')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {mode === 'edit' && supported(capabilityReport, mode, 'input_fidelity') && (
                <Field label={t('params.inputFidelity')} toggle={<ParamToggle checked={params.includeInputFidelity} onChange={(v) => patch('includeInputFidelity', v)} />}>
                  <PopoverSelect
                    value={params.inputFidelity}
                    onChange={(value) => patch('inputFidelity', value as ImageParams['inputFidelity'])}
                    options={[
                      { value: '', label: t('params.option.omit') },
                      { value: 'low', label: 'low' },
                      { value: 'high', label: 'high' }
                    ]}
                    ariaLabel={t('params.inputFidelity')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}
            </div>
          </section>
        )}

        {activeTab === 'output' && (
          <section className="inspector-group parameter-tab-panel">
            <header className="parameter-panel-head">
              <summary>{t('params.formatStreaming')}</summary>
              <p>{t('params.outputHint')}</p>
            </header>
            <div className="inspector-grid">
              {supported(capabilityReport, mode, 'output_format') && (
                <Field label={t('params.outputFormat')} toggle={<ParamToggle checked={params.includeOutputFormat} onChange={(v) => patch('includeOutputFormat', v)} />}>
                  <PopoverSelect
                    value={params.outputFormat}
                    onChange={(value) => patch('outputFormat', value as ImageParams['outputFormat'])}
                    options={[
                      { value: 'png', label: 'png' },
                      { value: 'jpeg', label: 'jpeg' },
                      { value: 'webp', label: 'webp' }
                    ]}
                    ariaLabel={t('params.outputFormat')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {supported(capabilityReport, mode, 'output_compression') && (
                <Field label={t('params.compression')} toggle={<ParamToggle checked={params.includeOutputCompression} onChange={(v) => patch('includeOutputCompression', v)} />}>
                  <input className="field-input" type="number" min={0} max={100} value={params.outputCompression} onChange={(e) => patch('outputCompression', Number(e.target.value))} />
                </Field>
              )}

              {supported(capabilityReport, mode, 'stream') && (
                <Field label={t('params.stream')} toggle={<ParamToggle checked={params.includeStream} onChange={(v) => patch('includeStream', v)} />}>
                  <PopoverSelect
                    value={String(params.stream)}
                    onChange={(value) => patch('stream', value === 'true')}
                    options={[
                      { value: 'false', label: t('params.option.false') },
                      { value: 'true', label: t('params.option.true') }
                    ]}
                    ariaLabel={t('params.stream')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {supported(capabilityReport, mode, 'partial_images') && (
                <Field label={t('params.partialImages')} toggle={<ParamToggle checked={params.includePartialImages} onChange={(v) => patch('includePartialImages', v)} />}>
                  <input className="field-input" type="number" min={0} max={3} value={params.partialImages} onChange={(e) => patch('partialImages', Number(e.target.value))} />
                </Field>
              )}
            </div>
          </section>
        )}

        {activeTab === 'service' && (
          <section className="inspector-group parameter-tab-panel">
            <header className="parameter-panel-head">
              <summary>{t('params.service')}</summary>
              <p>{t('params.serviceHint')}</p>
            </header>
            <div className="inspector-grid">
              {supported(capabilityReport, mode, 'response_format') && (
                <Field label={t('params.responseFormat')} toggle={<ParamToggle checked={params.includeResponseFormat} onChange={(v) => patch('includeResponseFormat', v)} />}>
                  <PopoverSelect
                    value={params.responseFormat}
                    onChange={(value) => patch('responseFormat', value as ImageParams['responseFormat'])}
                    options={[
                      { value: '', label: t('params.option.omit') },
                      { value: 'b64_json', label: 'b64_json' },
                      { value: 'url', label: 'url' }
                    ]}
                    ariaLabel={t('params.responseFormat')}
                    className="field-select"
                    triggerClassName="field-select-trigger"
                    panelClassName="field-select-panel"
                  />
                </Field>
              )}

              {supported(capabilityReport, mode, 'user') && (
                <Field label={t('params.user')} toggle={<ParamToggle checked={params.includeUser} onChange={(v) => patch('includeUser', v)} />}>
                  <input className="field-input" value={params.user} onChange={(e) => patch('user', e.target.value)} placeholder={t('params.optionalUser')} />
                </Field>
              )}

              <div className="control-card flat-check-card">
                <label className="inline-check flat">
                  <input type="checkbox" checked={params.includeModel} onChange={(e) => patch('includeModel', e.target.checked)} />
                  <span>{t('params.includeModelBefore')} <code>model</code> {t('params.includeModelAfter')}</span>
                </label>
              </div>

              <Field label={t('params.rawJson')}>
                <textarea className="field-input min-h-[120px] font-mono text-xs" value={params.rawJson} onChange={(e) => patch('rawJson', e.target.value)} placeholder={'{\n  "seed": 123,\n  "any_future_param": true\n}'} />
              </Field>
            </div>
          </section>
        )}

        {activeTab === 'retry' && (
          <section className="inspector-group parameter-tab-panel retry-tab-panel">
            <header className="parameter-panel-head">
              <summary>{t('params.retry')}</summary>
              <p>{t('params.retryHint')}</p>
            </header>
            <div className="retry-visual-card">
              <div className="retry-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>{params.retryAttempts > 0 ? t('params.retryEnabled') : t('params.retryDisabled')}</strong>
                <p>{params.retryAttempts > 0 ? t('params.retrySummary', { attempts: params.retryAttempts, seconds: params.retryDelaySeconds }) : t('params.retryDisabledText')}</p>
              </div>
            </div>
            <div className="inspector-grid">
              <Field label={t('params.retryAttempts')}>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  max={10}
                  value={params.retryAttempts}
                  onChange={(e) => patch('retryAttempts', clampNumber(Math.round(Number(e.target.value)), 0, 10))}
                />
              </Field>
              <Field label={t('params.retryDelaySeconds')}>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  max={600}
                  step={0.5}
                  value={params.retryDelaySeconds}
                  onChange={(e) => patch('retryDelaySeconds', clampNumber(Number(e.target.value), 0, 600))}
                />
              </Field>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
