import { useMemo } from 'react';
import type { GenerationModel, GenerationProvider } from '../../../domain/providerSettings';
import { useI18n } from '../../../i18n';
import { GroupedPicker, type GroupedPickerDensity, type GroupedPickerGroup } from '../../../shared/ui';
import { getProviderModelGroups, getSelectedModel } from '../modelOptions';

export interface ProviderModelPickerPanelProps {
  value: string;
  models: readonly GenerationModel[];
  providers: readonly GenerationProvider[];
  onChange: (modelId: string) => void;
  emptyText?: string;
  className?: string;
  density?: GroupedPickerDensity;
  autoFocusSearch?: boolean;
  testId?: string;
}

export function ProviderModelPickerPanel({
  value,
  models,
  providers,
  onChange,
  emptyText,
  className,
  density = 'comfortable',
  autoFocusSearch = true,
  testId
}: ProviderModelPickerPanelProps) {
  const { t } = useI18n();
  const selectedModel = useMemo(() => getSelectedModel(models, value), [models, value]);
  const selectedModelId = selectedModel?.id ?? value;
  const groups = useMemo<GroupedPickerGroup[]>(
    () => getProviderModelGroups(models, providers, selectedModelId).map((group) => ({
      id: group.providerId,
      label: group.providerName,
      description: group.providerAdapterId,
      disabled: group.disabled,
      items: group.models.map((model) => ({
        id: model.value,
        label: model.label,
        description: model.modelId,
        keywords: [model.providerName, model.description]
      }))
    })),
    [models, providers, selectedModelId]
  );

  return (
    <GroupedPicker
      groups={groups}
      value={selectedModelId}
      onChange={onChange}
      searchLabel={t('composer.modelSearchLabel')}
      searchPlaceholder={t('composer.modelSearchPlaceholder')}
      clearSearchLabel={t('composer.clearModelSearch')}
      groupNavigationLabel={t('composer.providersList')}
      itemListLabel={t('composer.modelsList')}
      emptyText={emptyText || t('app.warningNoModel')}
      noResultsText={t('composer.modelSearchEmpty')}
      className={className}
      density={density}
      autoFocusSearch={autoFocusSearch}
      testId={testId}
    />
  );
}
