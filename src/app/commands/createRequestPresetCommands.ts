import type { RequestPresetCommands } from '../../interface/context/commands';
import {
  createRequestPreset,
  normalizeRequestPresets,
  updateRequestPreset,
  type RequestPresetDisplayMeta,
  type RequestPresetSnapshot
} from '../../entities/request-presets';
import { sanitizeProviderModeDraftForModel } from '../../entities/provider/attachmentCompatibility';
import { resolveProviderGenerationModeForModelContext } from '../../entities/provider/modeResolution';
import type { RequestPresetCommandDeps } from './appCommandTypes';

function currentPresetMeta(args: RequestPresetCommandDeps): RequestPresetDisplayMeta {
  return {
    providerId: args.activeProvider?.id,
    providerLabel: args.activeProvider?.name,
    modelId: args.activeModel?.modelId,
    modelLabel: args.activeModel?.name || args.activeModel?.modelId,
    providerModeLabel: args.t(args.providerMode.labelKey)
  };
}

function currentPresetSnapshot(args: RequestPresetCommandDeps): RequestPresetSnapshot {
  return {
    providerModeId: args.providerModeId,
    selectedModelId: args.studioSettings.selectedModelId,
    params: args.params
  };
}

function resolvePresetModelId(args: RequestPresetCommandDeps, preset: RequestPresetSnapshot, fallbackModelId = args.studioSettings.selectedModelId): string {
  return args.studioSettings.models.some((model) => model.id === preset.selectedModelId)
    ? preset.selectedModelId
    : fallbackModelId;
}

export function createRequestPresetCommands(args: RequestPresetCommandDeps): RequestPresetCommands {
  return {
    saveCurrent: (name, note) => {
      const preset = createRequestPreset({
        name,
        note,
        snapshot: currentPresetSnapshot(args),
        meta: currentPresetMeta(args)
      });
      args.setRequestPresets((prev) => normalizeRequestPresets([preset, ...prev]));
      args.setCompatibilityNotice(args.t('requestPresets.savedNotice'));
    },

    applyPreset: (presetId) => {
      const preset = args.requestPresets.find((item) => item.id === presetId);
      if (!preset) return;

      const selectedModelId = resolvePresetModelId(args, preset.snapshot);
      const modelMissing = selectedModelId !== preset.snapshot.selectedModelId;
      const nextSettings = args.normalizeSettings({ ...args.studioSettings, selectedModelId });
      const compatibility = sanitizeProviderModeDraftForModel({
        providerModeId: preset.snapshot.providerModeId,
        targetImage: null,
        referenceImages: [],
        mask: null
      }, nextSettings, selectedModelId);

      args.replaceActiveComposerRequest({
        providerModeId: compatibility.value.providerModeId,
        params: preset.snapshot.params,
        selectedModelId,
        targetImage: null,
        referenceImages: [],
        mask: null
      }, modelMissing
        ? args.t('requestPresets.modelMissingNotice')
        : args.t('requestPresets.appliedNotice'));
    },

    updatePreset: (presetId, patch) => {
      args.setRequestPresets((prev) => normalizeRequestPresets(prev.map((preset) => {
        if (preset.id !== presetId) return preset;
        return updateRequestPreset(preset, {
          name: patch.name,
          note: patch.note,
          ...(patch.captureCurrent ? {
            snapshot: currentPresetSnapshot(args),
            meta: currentPresetMeta(args)
          } : {})
        });
      })));
      args.setCompatibilityNotice(args.t('requestPresets.updatedNotice'));
    },

    deletePreset: (presetId) => {
      args.setRequestPresets((prev) => prev.filter((preset) => preset.id !== presetId));
      args.setCompatibilityNotice(args.t('requestPresets.deletedNotice'));
    }
  };
}
