import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { ModelFields } from './ModelFields';

export function ModelEditor({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const { draft, removeModel } = context;

  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <strong>{t('settings.modelEditor')}</strong>
        <Button variant="secondary" tone="danger" onClick={removeModel} disabled={draft.models.length <= 1}>{t('settings.deleteModel')}</Button>
      </div>

      <ModelFields context={context} idPrefix="" mobile={false} />
    </div>
  );
}
