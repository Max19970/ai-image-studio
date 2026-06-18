import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui';
import { ProbeState } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from './ProviderCheckCard.module.css';

export function ProviderCheckCard({ context, mobile = false }: { context: SettingsSectionContext; mobile?: boolean }) {
  const { t } = useI18n();
  const {
    selectedProvider,
    probeModel,
    quickResult,
    showReport,
    probingProviderId,
    quickCheckingProviderId,
    probeError,
    commands
  } = context;
  if (!selectedProvider) return null;

  return (
    <div className={mobile ? '' : styles.providerCheckCard}>
      {mobile ? (
        <p className="mobile-muted">{t('settings.providerChecksHint', { model: probeModel?.modelId ?? t('info.noModel') })}</p>
      ) : (
        <div>
          <strong>{t('settings.providerChecks')}</strong>
          <p>{t('settings.providerChecksHint', { model: probeModel?.modelId ?? t('info.noModel') })}</p>
        </div>
      )}
      <div className={styles.probeActions}>
        <Button variant="secondary" onClick={() => commands.quickCheckProvider(selectedProvider, probeModel)} disabled={quickCheckingProviderId === selectedProvider.id}>
          {quickCheckingProviderId === selectedProvider.id ? t('settings.quickChecking') : t('settings.quickCheck')}
        </Button>
        <Button variant="primary" onClick={() => commands.probeProvider(selectedProvider, probeModel)} disabled={probingProviderId === selectedProvider.id}>
          {probingProviderId === selectedProvider.id ? t('settings.probeRunningShort') : t('settings.probeButtonShort')}
        </Button>
        <Button variant="secondary" onClick={() => commands.clearProbeCache(selectedProvider, probeModel)}>{t('settings.clearProbe')}</Button>
      </div>
      {quickResult && (
        <div className={`${styles.quickCheckResult} ${quickResult.ok ? styles.ok : styles.bad}`}>
          <strong>{quickResult.ok ? t('settings.quickOk') : t('settings.quickBad')}</strong>
          <span>{quickResult.status ? `HTTP ${quickResult.status} · ` : ''}{quickResult.message}</span>
        </div>
      )}
      <ProbeState report={showReport} probing={probingProviderId === selectedProvider.id} error={probeError} />
    </div>
  );
}
