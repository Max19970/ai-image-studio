import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { ProviderFields } from './ProviderFields';

export function ProviderEditor({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const { draft, removeProvider } = context;

  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <strong>{t('settings.providerEditor')}</strong>
        <Button variant="secondary" tone="danger" onClick={removeProvider} disabled={draft.providers.length <= 1}>{t('settings.deleteProvider')}</Button>
      </div>

      <ProviderFields context={context} idPrefix="" mobile={false} />
    </div>
  );
}
