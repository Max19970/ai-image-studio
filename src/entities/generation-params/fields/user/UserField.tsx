import { useI18n } from '../../../../i18n';
import { TextParamField } from '../shared/TextParamField';
import type { GenerationParamFieldProps } from '../../types';

export function UserField(props: GenerationParamFieldProps) {
  const { t } = useI18n();
  return (
    <TextParamField
      {...props}
      props={{ copyKey: 'user', valueKey: 'user', includeKey: 'includeUser', placeholder: t('params.optionalUser') }}
    />
  );
}
