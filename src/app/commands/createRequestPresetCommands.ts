import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { RequestPresetCommands } from '../../interface/context/commands';
import {
  applyRequestPresetToDraft,
  createRequestPreset,
  normalizeRequestPresets,
  updateRequestPreset,
  type RequestPresetDisplayMeta,
  type RequestPresetSnapshot
} from '../../entities/request-presets';
import { sanitizeBatchDraftForSettings, sanitizeProviderModeDraftForModel } from '../../entities/provider/compatibility';
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

function getDraftModelAndProvider(args: RequestPresetCommandDeps, draft: BatchComposerDraft): {
  model: GenerationModel | null;
  provider: GenerationProvider | null;
} {
  const model = args.studioSettings.models.find((item) => item.id === draft.selectedModelId) ?? null;
  const provider = model
    ? args.studioSettings.providers.find((item) => item.id === model.providerId) ?? null
    : null;
  return { model, provider };
}

function draftPresetMeta(args: RequestPresetCommandDeps, draft: BatchComposerDraft): RequestPresetDisplayMeta {
  const { model, provider } = getDraftModelAndProvider(args, draft);
  const providerMode = resolveProviderGenerationModeForModelContext(args.studioSettings, model, draft.providerModeId).activeMode;
  return {
    providerId: provider?.id,
    providerLabel: provider?.name,
    modelId: model?.modelId,
    modelLabel: model?.name || model?.modelId,
    providerModeLabel: args.t(providerMode.labelKey)
  };
}

function draftPresetSnapshot(draft: BatchComposerDraft): RequestPresetSnapshot {
  return {
    providerModeId: draft.providerModeId,
    selectedModelId: draft.selectedModelId,
    params: draft.params
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

    saveBatchDraft: (draftId, name, note) => {
      const draft = args.batchDrafts.find((item) => item.id === draftId);
      if (!draft) return;
      const preset = createRequestPreset({
        name,
        note,
        snapshot: draftPresetSnapshot(draft),
        meta: draftPresetMeta(args, draft)
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

      args.setStudioSettings(nextSettings);
      args.setParams(preset.snapshot.params);
      args.setProviderModeId(compatibility.value.providerModeId);
      args.setTargetImage(null);
      args.setReferenceImages([]);
      args.setMask(null);
      args.setCompatibilityNotice(modelMissing
        ? args.t('requestPresets.modelMissingNotice')
        : args.t('requestPresets.appliedNotice'));
    },

    updatePreset: (presetId, patch) => {
      args.setRequestPresets((prev) => normalizeRequestPresets(prev.map((preset) => {
        if (preset.id !== presetId) return preset;
        const draft = patch.captureBatchDraftId
          ? args.batchDrafts.find((item) => item.id === patch.captureBatchDraftId) ?? null
          : null;
        return updateRequestPreset(preset, {
          name: patch.name,
          note: patch.note,
          ...(patch.captureCurrent ? {
            snapshot: currentPresetSnapshot(args),
            meta: currentPresetMeta(args)
          } : {}),
          ...(draft ? {
            snapshot: draftPresetSnapshot(draft),
            meta: draftPresetMeta(args, draft)
          } : {})
        });
      })));
      args.setCompatibilityNotice(args.t('requestPresets.updatedNotice'));
    },

    deletePreset: (presetId) => {
      args.setRequestPresets((prev) => prev.filter((preset) => preset.id !== presetId));
      args.setCompatibilityNotice(args.t('requestPresets.deletedNotice'));
    },

    applyPresetToBatchDraft: (draftId, presetId) => {
      const preset = args.requestPresets.find((item) => item.id === presetId);
      if (!preset) return;
      args.setBatchDrafts((prev) => prev.map((draft) => {
        if (draft.id !== draftId) return draft;
        const selectedModelId = resolvePresetModelId(args, preset.snapshot, draft.selectedModelId);
        const draftPreset = {
          ...preset,
          snapshot: {
            ...preset.snapshot,
            selectedModelId
          }
        };
        return sanitizeBatchDraftForSettings(applyRequestPresetToDraft(draft, draftPreset), args.studioSettings).value;
      }));
      args.setCompatibilityNotice(args.t('requestPresets.appliedToDraftNotice'));
    }
  };
}
