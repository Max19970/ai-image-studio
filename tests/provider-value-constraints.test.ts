import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultImageParams, defaultProviderSettings } from '../src/domain/defaults';
import { comfyUiHiresFixMode } from '../src/entities/generation-params/comfyui/modes';
import { buildComfyUiPayload, defaultComfyUiParamState, toComfyUiProviderParamState } from '../src/entities/generation-params/comfyui/state';
import { openAiCompatibleImageGenerateMode } from '../src/entities/generation-params/openai-compatible/modes';
import { getOpenAiCompatibleSize } from '../src/entities/generation-params/serializers/openAiCompatible';
import { resolveModeImageSize } from '../src/entities/provider/valueConstraints';

test('provider modes snap custom sizes down to accepted values', () => {
  assert.deepEqual(resolveModeImageSize(1025, 1023, openAiCompatibleImageGenerateMode), { width: 1024, height: 1016 });
  assert.deepEqual(resolveModeImageSize(65, 4097, comfyUiHiresFixMode), { width: 64, height: 4096 });
});

test('OpenAI custom size payload uses snapped mode size', () => {
  const size = getOpenAiCompatibleSize({ ...defaultImageParams, sizeMode: 'custom', width: 1025, height: 1023 }, openAiCompatibleImageGenerateMode);
  assert.equal(size, '1024x1016');
});

test('ComfyUI upscale payload resolves target size from source dimensions and scale', () => {
  const payload = buildComfyUiPayload({
    ...defaultImageParams,
    prompt: 'test prompt',
    providerParams: {
      comfyui: toComfyUiProviderParamState({
        ...defaultComfyUiParamState,
        hiresScale: 1.57,
        hiresInputWidth: 641,
        hiresInputHeight: 481
      })
    }
  }, { ...defaultProviderSettings, adapterId: 'comfyui', modelId: 'checkpoint.safetensors' }, comfyUiHiresFixMode);

  assert.equal(payload.width, 1000);
  assert.equal(payload.height, 752);
  assert.equal(payload.hires_upscale_factor, 1.57);
  assert.equal(payload.batch_size, 1);
});
