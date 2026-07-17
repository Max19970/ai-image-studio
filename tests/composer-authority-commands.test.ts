import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultComfyUiGenerationModel,
  defaultComfyUiGenerationProvider,
  defaultImageParams,
  defaultStudioSettings
} from '../src/domain/defaults';
import type { GenerationRequestSnapshot, GenerationTask } from '../src/domain/generationTask';
import { createSettingsCommands } from '../src/app/commands/createSettingsCommands';
import { restoreRequestToWorkspaceCommand } from '../src/app/commands/workspaceCommands';
import { startGalleryHiresFixCommand } from '../src/app/commands/galleryHiresFixCommand';

const t = (key: string) => key;

function snapshot(overrides: Partial<GenerationRequestSnapshot> = {}): GenerationRequestSnapshot {
  return {
    createdAt: 1,
    mode: 'generate',
    providerModeId: 'openai-compatible.image-generate',
    prompt: 'restored prompt',
    endpoint: '/api/test',
    providerLabel: 'Provider',
    model: defaultStudioSettings.models[0].modelId,
    modelLabel: defaultStudioSettings.models[0].name,
    payload: { prompt: 'restored prompt' },
    warnings: [],
    attachments: [],
    params: { n: 2 },
    ...overrides
  };
}

test('Settings Apply persists once and delegates all-draft reconciliation atomically', () => {
  const applied: Array<{ settings: typeof defaultStudioSettings; notice: string }> = [];
  let legacySetCalls = 0;
  let batchSanitizeCalls = 0;
  const commands = createSettingsCommands({
    studioSettings: defaultStudioSettings,
    activeProvider: null,
    activeModel: null,
    setStudioSettings: () => { legacySetCalls += 1; },
    applyStudioSettingsToComposer: (settings, notice) => applied.push({ settings, notice }),
    normalizeSettings: (settings) => settings,
    composerCompatibility: {
      t,
      providerModeId: 'openai-compatible.image-generate',
      studioSettings: defaultStudioSettings,
      targetImage: null,
      referenceImages: [],
      mask: null,
      setProviderModeId: () => undefined,
      setCompatibilityNotice: () => undefined,
      setTargetImage: () => undefined,
      setReferenceImages: () => undefined,
      setMask: () => undefined
    },
    batchCompatibility: {
      setBatchDrafts: (updater) => {
        batchSanitizeCalls += 1;
        if (typeof updater === 'function') updater([]);
      }
    },
    providerProbe: {
      setCapabilityReport: () => undefined,
      clearCapabilityReport: () => undefined,
      setProbeError: () => undefined,
      setProbingProviderId: () => undefined,
      setQuickCheckingProviderId: () => undefined,
      setQuickCheckResults: () => undefined
    }
  });

  commands.save(defaultStudioSettings);

  assert.equal(applied.length, 1);
  assert.equal(applied[0].settings, defaultStudioSettings);
  assert.equal(applied[0].notice, 'composer.compatibilityAdjustedRequest');
  assert.equal(legacySetCalls, 0);
  assert.equal(batchSanitizeCalls, 1);
});

test('history restore replaces the active request in one command', () => {
  const replacements: Array<{ request: any; notice: string | null }> = [];
  const selectedTasks: Array<string | null> = [];
  const selectedImages: Array<string | null> = [];

  restoreRequestToWorkspaceCommand(snapshot({ attachments: [{ role: 'target', name: 'old.png', size: 1, type: 'image/png' }] }), {
    t,
    params: defaultImageParams,
    settings: defaultStudioSettings,
    replaceActiveComposerRequest: (request, notice) => replacements.push({ request, notice }),
    setSelectedTaskId: (value) => selectedTasks.push(typeof value === 'function' ? value(null) : value),
    setSelectedImageId: (value) => selectedImages.push(typeof value === 'function' ? value(null) : value)
  });

  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].request.params.prompt, 'restored prompt');
  assert.equal(replacements[0].request.params.n, 2);
  assert.equal(replacements[0].request.selectedModelId, defaultStudioSettings.selectedModelId);
  assert.equal(replacements[0].notice, 'composer.restoreNeedsFiles');
  assert.deepEqual(selectedTasks, [null]);
  assert.deepEqual(selectedImages, [null]);
});

test('gallery hires-fix replaces model, mode, params and attachment atomically', async (context) => {
  if (!defaultComfyUiGenerationProvider || !defaultComfyUiGenerationModel) {
    context.skip('Default ComfyUI adapter fixture is unavailable.');
    return;
  }
  const settings = {
    ...defaultStudioSettings,
    providers: [defaultComfyUiGenerationProvider],
    models: [defaultComfyUiGenerationModel],
    selectedModelId: defaultComfyUiGenerationModel.id
  };
  const replacements: any[] = [];
  const image = {
    id: 'image-1',
    taskId: 'task-1',
    src: 'data:image/png;base64,iVBORw0KGgo=',
    format: 'png',
    kind: 'final',
    index: 0,
    createdAt: 1,
    request: snapshot({ model: defaultComfyUiGenerationModel.modelId, modelLabel: defaultComfyUiGenerationModel.name })
  } as const;
  const task = {
    id: 'task-1',
    kind: 'single',
    status: 'succeeded',
    createdAt: 1,
    updatedAt: 1,
    request: image.request,
    images: [image]
  } as GenerationTask;

  await startGalleryHiresFixCommand({
    t,
    params: defaultImageParams,
    studioSettings: settings,
    replaceActiveComposerRequest: (request, notice) => replacements.push({ request, notice }),
    setWorkspaceTab: () => undefined,
    setSelectedTaskId: () => undefined,
    setSelectedImageId: () => undefined,
    setCompatibilityNotice: () => undefined
  }, task, image);

  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].request.selectedModelId, defaultComfyUiGenerationModel.id);
  assert.equal(replacements[0].request.providerModeId, 'comfyui.hires-fix');
  assert.ok(replacements[0].request.targetImage instanceof File);
  assert.deepEqual(replacements[0].request.referenceImages, []);
  assert.equal(replacements[0].request.mask, null);
  assert.equal(replacements[0].notice, null);
});
