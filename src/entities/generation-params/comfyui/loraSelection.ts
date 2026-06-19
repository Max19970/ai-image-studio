import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderSettings } from '../../../domain/providerSettings';
import type { StudioSettings } from '../../../domain/studioSettings';
import { readComfyUiSettingsData, type ComfyUiLoraRegistration } from '../../../domain/comfyUiSettings';
import { readComfyUiParamState, toComfyUiProviderParamState, type ComfyUiLoraSelection } from './state';

export interface ComfyUiLoraControlOption {
  id: string;
  label: string;
  loraName: string;
  description: string;
  selected: boolean;
  strengthModel: number;
  strengthClip: number;
}

function createSelection(registration: ComfyUiLoraRegistration): ComfyUiLoraSelection {
  return {
    name: registration.loraName,
    strengthModel: registration.defaultStrengthModel,
    strengthClip: registration.defaultStrengthClip,
    enabled: true
  };
}

export function getComfyUiRegisteredLoraOptions(
  settings: Pick<StudioSettings, 'adapterData'>,
  params: ImageParams,
  provider: ProviderSettings
): ComfyUiLoraControlOption[] {
  const data = readComfyUiSettingsData(settings);
  const state = readComfyUiParamState(params, provider);
  const activeNames = new Set(state.loras.filter((lora) => lora.enabled).map((lora) => lora.name));

  return data.loras.map((registration) => ({
    id: registration.id,
    label: registration.displayName || registration.loraName,
    loraName: registration.loraName,
    description: `${registration.loraName} · ${registration.defaultStrengthModel}/${registration.defaultStrengthClip}`,
    selected: activeNames.has(registration.loraName),
    strengthModel: registration.defaultStrengthModel,
    strengthClip: registration.defaultStrengthClip
  }));
}

export function toggleComfyUiRegisteredLora(
  params: ImageParams,
  provider: ProviderSettings,
  registration: ComfyUiLoraRegistration
): ImageParams {
  const state = readComfyUiParamState(params, provider);
  const hasEnabled = state.loras.some((lora) => lora.name === registration.loraName && lora.enabled);
  const nextLoras = hasEnabled
    ? state.loras.map((lora) => lora.name === registration.loraName ? { ...lora, enabled: false } : lora)
    : [
      ...state.loras.filter((lora) => lora.name !== registration.loraName),
      createSelection(registration)
    ];

  return {
    ...params,
    providerParams: {
      ...(params.providerParams ?? {}),
      comfyui: toComfyUiProviderParamState({ ...state, loras: nextLoras })
    }
  };
}

export function toggleComfyUiRegisteredLoraById(
  settings: Pick<StudioSettings, 'adapterData'>,
  params: ImageParams,
  provider: ProviderSettings,
  registrationId: string
): ImageParams {
  const registration = readComfyUiSettingsData(settings).loras.find((item) => item.id === registrationId);
  return registration ? toggleComfyUiRegisteredLora(params, provider, registration) : params;
}
