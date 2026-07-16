const now = Date.now();

export const viewports = {
  narrowMobile: { width: 360, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 1000, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};

const sampleImage = (seed) => {
  const hue = seed * 57;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,72%)"/><stop offset="0.55" stop-color="hsl(${hue + 72},54%,34%)"/><stop offset="1" stop-color="hsl(${hue + 140},78%,18%)"/></linearGradient><radialGradient id="r" cx=".62" cy=".3" r=".6"><stop offset="0" stop-color="rgba(255,255,255,.82)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><rect width="900" height="1200" fill="url(#g)"/><circle cx="650" cy="240" r="330" fill="url(#r)"/><path d="M90 880 C220 520 460 460 810 250" fill="none" stroke="rgba(255,255,255,.48)" stroke-width="44" stroke-linecap="round"/><path d="M120 990 C290 720 470 680 760 560" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="60" stroke-linecap="round"/><text x="80" y="1120" fill="rgba(255,255,255,.78)" font-family="Arial" font-size="72" font-weight="700">Sample ${seed}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};


const telegramDefinition = {
  id: 'telegram',
  label: 'Телеграм',
  description: 'Бот и Mini App, открывающее Image Studio внутри Telegram.',
  kind: 'messaging',
  order: 10,
  capabilities: {
    supportsRuntime: true,
    supportsSecrets: true,
    supportsMiniApp: true,
    supportsActions: true,
    secrets: [{ id: 'botToken', label: 'Токен бота', required: true }],
    actions: [
      { id: 'validate-token', label: 'Проверить токен', kind: 'diagnostic', requiresConfiguredSecret: true },
      { id: 'apply-menu-button', label: 'Настроить кнопку меню', kind: 'config', requiresConfiguredSecret: true },
      { id: 'start-runtime', label: 'Запустить бота', kind: 'runtime', requiresConfiguredSecret: true },
      { id: 'stop-runtime', label: 'Остановить бота', kind: 'runtime' },
      { id: 'send-test-message', label: 'Отправить тестовое сообщение', kind: 'diagnostic', requiresConfiguredSecret: true }
    ]
  }
};

const telegramStatus = (state = 'stopped', message = 'Telegram bot runtime is stopped.') => ({
  id: 'telegram',
  state,
  startedAt: state === 'running' ? now - 30000 : null,
  updatedAt: now,
  message,
  metadata: state === 'running' ? { launchMode: 'polling', username: 'image_studio_demo_bot' } : undefined
});

const telegramConfigSnapshot = ({ tokenConfigured = false, tokenPreview = '123456…T0kN', enabled = false, running = false } = {}) => ({
  definition: telegramDefinition,
  config: {
    id: 'telegram',
    enabled,
    values: {
      miniAppUrl: enabled ? 'https://studio.example.com' : '',
      menuButtonText: 'Open Image Studio',
      startMessage: 'Open Image Studio from the button below.',
      allowedUserIds: enabled ? '123456789, 987654321' : '',
      pollingIntervalMs: 1500
    },
    secrets: {
      botToken: {
        configured: tokenConfigured,
        preview: tokenConfigured ? tokenPreview : undefined,
        updatedAt: tokenConfigured ? now - 60000 : null
      }
    },
    createdAt: now - 120000,
    updatedAt: now - 60000
  },
  status: running ? telegramStatus('running', 'Telegram bot polling is active.') : telegramStatus()
});

const telegramApiFixture = ({ saved = false, running = false, validationFails = false } = {}) => ({
  integrations: [telegramDefinition],
  snapshot: telegramConfigSnapshot({ tokenConfigured: saved, enabled: saved, running }),
  actionResults: {
    'validate-token': validationFails
      ? { ok: false, message: 'settings.telegram.validationMockFailed', status: telegramStatus('error', 'Bot API returned 401 Unauthorized.') }
      : { ok: true, message: 'settings.telegram.validationMockOk', data: { username: 'image_studio_demo_bot' } },
    'apply-menu-button': { ok: true, message: 'Telegram menu button configured.' },
    'start-runtime': { ok: true, message: 'Telegram bot started.', status: telegramStatus('running', 'Telegram bot polling is active.') },
    'stop-runtime': { ok: true, message: 'Telegram bot stopped.', status: telegramStatus('stopped', 'Telegram bot stopped.') },
    'send-test-message': { ok: true, message: 'Telegram test message sent.' }
  },
  miniAppValidation: { ok: false, message: 'Telegram initData hash is invalid.' }
});

export const seedData = {
  paramsKey: 'gpt-image-2-studio.params.v2',
  tasksKey: 'image-studio.generation-tasks.v1',
  settingsKey: 'image-studio.settings.v1',
  comfySettings: {
    providers: [{
      id: 'p-comfy-shot',
      name: 'Local ComfyUI',
      adapterId: 'comfyui',
      generationEndpoint: 'http://127.0.0.1:8188',
      editEndpoint: '',
      responsesEndpoint: '',
      apiKey: '',
      authHeaderName: '',
      authScheme: '',
      customHeadersJson: '',
      timeoutMs: 300000,
      persistApiKey: false
    }],
    models: [{ id: 'm-comfy-shot', name: 'Dream local checkpoint', providerId: 'p-comfy-shot', modelId: 'dream-local.safetensors', notes: '' }],
    selectedModelId: 'm-comfy-shot',
    interfaceTheme: 'glass',
    adapterData: {
      comfyui: {
        loras: [{ id: 'lora-soft-shot', displayName: 'Soft painterly style', loraName: 'soft-painterly.safetensors', notes: 'Screenshot fixture', defaultStrengthModel: 0.75, defaultStrengthClip: 0.65 }],
        resourceCache: {}
      }
    }
  },
  params: {
    prompt: '',
    n: 1,
    sizeMode: 'preset',
    sizePreset: '1024x1024',
    width: 1024,
    height: 1024,
    quality: 'auto',
    background: 'auto',
    moderation: 'auto',
    outputFormat: 'png',
    outputCompression: 100,
    stream: false,
    partialImages: 0,
    responseFormat: '',
    inputFidelity: '',
    user: '',
    style: '',
    retryAttempts: 1,
    retryDelaySeconds: 10,
    rawJson: '',
    includeModel: true,
    includeN: true,
    includeQuality: true,
    includeBackground: true,
    includeModeration: true,
    includeOutputFormat: true,
    includeOutputCompression: false,
    includeStream: false,
    includePartialImages: false,
    includeResponseFormat: false,
    includeInputFidelity: false,
    includeUser: false,
    includeStyle: false
  },
  tasks: Array.from({ length: 12 }, (_, i) => {
    const request = {
      createdAt: now,
      mode: 'generate',
      prompt: 'Universal screenshot sample prompt',
      endpoint: 'https://api.openai.com/v1/images/generations',
      providerLabel: 'OpenAI',
      model: 'gpt-image-2',
      modelLabel: 'GPT Image 2',
      payload: { model: 'gpt-image-2', prompt: 'Universal screenshot sample prompt', n: 1, size: '1024x1536' },
      warnings: [],
      attachments: [
        { role: 'target', name: 'target-reference.png', size: 420000, type: 'image/png', previewUrl: sampleImage(31) },
        { role: 'reference', name: 'style-reference.png', size: 360000, type: 'image/png', previewUrl: sampleImage(32) },
        { role: 'mask', name: 'mask-map.png', size: 120000, type: 'image/png', previewUrl: sampleImage(33) }
      ],
      params: { n: 1, sizeMode: 'preset', sizePreset: '1024x1536', width: 1024, height: 1536, quality: 'auto', background: 'auto', moderation: 'auto', outputFormat: 'png', outputCompression: 100, stream: false, partialImages: 0, inputFidelity: '', style: '', retryAttempts: 1, retryDelaySeconds: 10 }
    };

    return {
      id: `sample-task-${i}`,
      kind: i === 3 ? 'batch' : 'single',
      status: i === 1 ? 'failed' : i === 2 ? 'streaming' : 'succeeded',
      createdAt: now - i * 450000,
      updatedAt: now - i * 320000,
      request,
      images: i === 1 ? [] : [{ id: `sample-image-${i}`, taskId: `sample-task-${i}`, src: sampleImage(i + 1), format: 'png', kind: 'final', index: i, createdAt: now - i * 450000, request }],
      error: i === 1 ? 'Synthetic failed request for layout testing.' : null,
      batch: i === 3 ? { intervalMs: 4000, items: [] } : undefined
    };
  })
};


const comfyDetailRequest = {
  createdAt: now,
  mode: 'generate',
  prompt: 'Local ComfyUI cinematic fox in a rainy neon alley',
  endpoint: 'http://127.0.0.1:8188',
  providerLabel: 'Local ComfyUI',
  providerAdapterId: 'comfyui',
  model: 'dream-local.safetensors',
  modelLabel: 'Dream local checkpoint',
  surfaceId: 'comfyui.text-to-image',
  providerParams: {
    width: 1024,
    height: 1536,
    batchSize: 1,
    steps: 28,
    cfg: 6.5,
    samplerName: 'euler',
    scheduler: 'normal',
    seedMode: 'fixed',
    seed: 424242,
    denoise: 1,
    negativePrompt: 'blurry, low quality',
    filenamePrefix: 'ImageStudio',
    loras: [{ name: 'soft-painterly.safetensors', strengthModel: 0.75, strengthClip: 0.65, enabled: true }]
  },
  parameterSummary: {
    surfaceId: 'comfyui.text-to-image',
    title: 'ComfyUI workflow parameters',
    entries: [
      { id: 'checkpoint', label: 'Checkpoint', value: 'dream-local.safetensors' },
      { id: 'size', label: 'Size', value: '1024×1536' },
      { id: 'batchSize', label: 'Batch size', value: '1' },
      { id: 'steps', label: 'Steps', value: '28' },
      { id: 'cfg', label: 'CFG', value: '6.5' },
      { id: 'sampler', label: 'Sampler', value: 'euler' },
      { id: 'scheduler', label: 'Scheduler', value: 'normal' },
      { id: 'seed', label: 'Seed', value: '424242' },
      { id: 'denoise', label: 'Denoise', value: '1' },
      { id: 'filenamePrefix', label: 'Filename prefix', value: 'ImageStudio' },
      { id: 'loras', label: 'LoRA stack', value: 'soft-painterly.safetensors (0.75/0.65)' },
      { id: 'negativePrompt', label: 'Negative prompt', value: 'blurry, low quality' }
    ]
  },
  payload: {
    prompt: 'Local ComfyUI cinematic fox in a rainy neon alley',
    checkpoint: 'dream-local.safetensors',
    width: 1024,
    height: 1536,
    batch_size: 1,
    steps: 28,
    cfg: 6.5,
    sampler_name: 'euler',
    scheduler: 'normal',
    seed: 424242,
    denoise: 1,
    filename_prefix: 'ImageStudio',
    negative_prompt: 'blurry, low quality',
    loras: [{ lora_name: 'soft-painterly.safetensors', strength_model: 0.75, strength_clip: 0.65 }]
  },
  warnings: [],
  attachments: [],
  params: { n: 1, sizeMode: 'preset', sizePreset: '1024x1536', width: 1024, height: 1536, quality: 'auto', background: 'auto', moderation: 'auto', outputFormat: 'png', outputCompression: 100, stream: false, partialImages: 0, inputFidelity: '', style: '', retryAttempts: 1, retryDelaySeconds: 10 }
};

const comfyDetailRaw = {
  provider: 'comfyui',
  output_format: 'png',
  comfyui: {
    prompt_id: 'shot-comfy-prompt-001',
    checkpoint: 'dream-local.safetensors',
    seed: 424242,
    images: [{ filename: 'ImageStudio_00001_.png', subfolder: '', type: 'output' }],
    workflow: {
      '1': { class_type: 'CheckpointLoaderSimple' },
      '2': { class_type: 'LoraLoader' },
      '3': { class_type: 'CLIPTextEncode' },
      '4': { class_type: 'KSampler' },
      '5': { class_type: 'VAEDecode' },
      '6': { class_type: 'SaveImage' }
    },
    history: { outputs: { '6': { images: [{ filename: 'ImageStudio_00001_.png', subfolder: '', type: 'output' }] } } }
  }
};

const comfyDetailTasks = [{
  id: 'sample-comfy-task',
  kind: 'single',
  status: 'succeeded',
  createdAt: now,
  updatedAt: now,
  request: comfyDetailRequest,
  images: [{ id: 'sample-comfy-image', taskId: 'sample-comfy-task', src: sampleImage(91), format: 'png', kind: 'final', index: 0, createdAt: now, raw: { comfyui: { filename: 'ImageStudio_00001_.png', type: 'output' } }, request: comfyDetailRequest }],
  raw: comfyDetailRaw,
  error: null
}];

export const scenarios = [
  { name: 'gallery', assertSelector: '[data-gallery-slot="image-wall"]', steps: [{ type: 'waitForSelector', selector: '[data-gallery-slot="image-wall"]' }, { type: 'screenshot' }] },
  {
    name: 'gallery-filesystem',
    seedFolders: [
      { id: '/Characters', path: '/Characters', name: 'Characters', createdAt: now - 4000, updatedAt: now - 4000 },
      { id: '/Characters/Alice', path: '/Characters/Alice', name: 'Alice', createdAt: now - 3000, updatedAt: now - 3000 },
      { id: '/Characters/Bosses', path: '/Characters/Bosses', name: 'Bosses', createdAt: now - 2000, updatedAt: now - 2000 },
      { id: '/References', path: '/References', name: 'References', createdAt: now - 1000, updatedAt: now - 1000 }
    ],
    seedPins: [{ itemKind: 'folder', itemId: '/Characters', createdAt: now - 500 }],
    assertSelector: '[data-gallery-slot="image-wall"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-gallery-slot="image-wall"]' },
      { type: 'wait', ms: 180 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-folder-navigation-toggle',
    seedFolders: [
      { id: '/Characters', path: '/Characters', name: 'Characters', createdAt: now - 4000, updatedAt: now - 4000 },
      { id: '/Characters/Alice', path: '/Characters/Alice', name: 'Alice', createdAt: now - 3000, updatedAt: now - 3000 },
      { id: '/References', path: '/References', name: 'References', createdAt: now - 1000, updatedAt: now - 1000 }
    ],
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-folder-navigator-toggle"]' },
      { type: 'click', selector: '[data-testid="gallery-folder-navigator-toggle"]' },
      { type: 'wait', ms: 300 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-folder-create',
    seedFolders: [
      { id: '/Characters', path: '/Characters', name: 'Characters', createdAt: now - 4000, updatedAt: now - 4000 },
      { id: '/Characters/Alice', path: '/Characters/Alice', name: 'Alice', createdAt: now - 3000, updatedAt: now - 3000 }
    ],
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-folder-tree-create"]', viewports: ['desktop'] },
      { type: 'click', selector: '[data-testid="gallery-folder-tree-create"]', viewports: ['desktop'] },
      { type: 'click', selector: '[data-testid="gallery-folder-navigator-toggle"]', viewports: ['mobile'] },
      { type: 'waitForSelector', selector: '[data-testid="gallery-folder-tree-create"]', viewports: ['mobile'] },
      { type: 'click', selector: '[data-testid="gallery-folder-tree-create"]', viewports: ['mobile'] },
      { type: 'waitForSelector', selector: '[data-testid="gallery-folder-creator"]' },
      { type: 'wait', ms: 300 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-controls-collapsed',
    assertSelector: '[data-gallery-slot="image-wall"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-archive-controls-toggle"]' },
      { type: 'click', selector: '[data-testid="gallery-archive-controls-toggle"]' },
      { type: 'wait', ms: 300 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-filters',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-filters-toggle"]' },
      { type: 'click', selector: '[data-testid="gallery-filters-toggle"]' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-filter-panel"]' },
      { type: 'wait', ms: 300 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-filesystem-scrolled',
    seedFolders: [
      { id: '/Characters', path: '/Characters', name: 'Characters', createdAt: now - 4000, updatedAt: now - 4000 },
      { id: '/Characters/Alice', path: '/Characters/Alice', name: 'Alice', createdAt: now - 3000, updatedAt: now - 3000 },
      { id: '/Characters/Bosses', path: '/Characters/Bosses', name: 'Bosses', createdAt: now - 2000, updatedAt: now - 2000 },
      { id: '/References', path: '/References', name: 'References', createdAt: now - 1000, updatedAt: now - 1000 }
    ],
    assertSelector: '[data-gallery-slot="image-wall"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-gallery-slot="image-wall"]' },
      { type: 'scrollToSelector', selector: '[data-testid="gallery-item"]:last-child' },
      { type: 'wait', ms: 180 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-empty',
    seedTasks: [],
    steps: [
      { type: 'waitForSelector', selector: '[data-gallery-slot="empty"]' },
      { type: 'wait', ms: 180 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-compact',
    seedParams: { prompt: 'cinematic portrait, soft window light' },
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-dock"][data-composer-expanded="false"]' },
      { type: 'wait', ms: 180 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'composer-long-prompt',
    assertSelector: '[data-testid="composer-dock"][data-composer-expanded="false"] [data-prompt-state]',
    seedParams: {
      prompt: 'Длинный тестовый prompt для проверки compact composer на узком телефоне. Он должен оставаться в одну компактную строку и не раздувать нижний dock до четверти экрана до явного раскрытия панели запроса.'
    },
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-dock"][data-composer-expanded="false"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-attachments',
    assertSelector: '[data-testid="composer-dock"][data-composer-attachments="1"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-mode-openai-compatible.image-edit"]' },
      { type: 'click', selector: '[data-testid="composer-mode-openai-compatible.image-edit"]' },
      { type: 'keyboard', key: 'Escape' },
      { type: 'wait', ms: 160 },
      { type: 'waitForSelector', selector: '[data-testid="composer-attachments-input"]' },
      { type: 'upload', selector: '[data-testid="composer-attachments-input"]', files: ['scripts/fixtures/sample-upload.png'] },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-mask',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-mask-input"]' },
      { type: 'upload', selector: '[data-testid="composer-mask-input"]', files: ['scripts/fixtures/sample-upload.png'] },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-controls',
    assertSelector: '[data-testid="composer-controls-panel"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-request-presets',
    seedParams: {
      prompt: 'soft cinematic portrait, warm window light, painterly details'
    },
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="request-presets-open"]' },
      { type: 'click', selector: '[data-testid="request-presets-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="request-presets-panel"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-request-presets-saved',
    seedParams: {
      prompt: 'soft cinematic portrait, warm window light, painterly details'
    },
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="request-presets-open"]' },
      { type: 'click', selector: '[data-testid="request-presets-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="request-presets-save-current"]' },
      { type: 'click', selector: '[data-testid="request-presets-save-current"]' },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'composer-comfy-controls',
    seedSettings: seedData.comfySettings,
    seedParams: {
      providerParams: { comfyui: { checkpoint: 'dream-local.safetensors', width: 1024, height: 1024, batchSize: 1, steps: 24, cfg: 6.5, samplerName: 'euler', scheduler: 'normal', seedMode: 'random', seed: 1, denoise: 1, negativePrompt: '', filenamePrefix: 'ImageStudio', loras: [] } }
    },
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-parameters"]' },
      { type: 'wait', ms: 240 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-edit-status',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-mode-edit"]' },
      { type: 'click', selector: '[data-testid="composer-mode-edit"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'composer-model-picker',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="composer-controls"]' },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-model-picker"]' },
      { type: 'click', selector: '[data-testid="composer-model-picker"]' },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-quick-actions',
    assertSelector: '[role="menu"], [role="dialog"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-quick-actions"]' },
      { type: 'click', selector: '[data-testid="gallery-quick-actions"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-selection',
    assertSelector: '[data-testid="gallery-selection-toolbar"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-selection-start"]' },
      { type: 'click', selector: '[data-testid="gallery-selection-start"]' },
      { type: 'click', selector: '[data-testid="gallery-item"]' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-selection-toolbar"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-destination-picker',
    assertSelector: '[data-testid="gallery-destination-picker-body"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-selection-start"]' },
      { type: 'click', selector: '[data-testid="gallery-selection-start"]' },
      { type: 'click', selector: '[data-testid="gallery-item"]' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-selection-move"]' },
      { type: 'click', selector: '[data-testid="gallery-selection-move"]' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-destination-picker-body"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'gallery-delete-dialog-recovery',
    assertSelector: '[data-testid="composer-controls-panel"]',
    steps: [
      { type: 'waitForSelector', selector: '[data-testid="gallery-quick-actions"]' },
      { type: 'click', selector: '[data-testid="gallery-quick-actions"]' },
      { type: 'waitForSelector', selector: '[role="menu"] [data-gallery-action="delete"]' },
      { type: 'click', selector: '[role="menu"] [data-gallery-action="delete"]' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-delete-task-dialog"]' },
      { type: 'click', selector: '[data-testid="gallery-delete-task-dialog"] footer button:last-child' },
      { type: 'wait', ms: 220 },
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-controls-panel"]' },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'navigation-responsive',
    assertSelectorByViewport: {
      desktop: '[data-testid="sidebar-rail"] [data-testid="sidebar-expand"]',
      mobile: '[data-settings-section="interface"][data-settings-variant="mobile"]'
    },
    steps: [
      { type: 'click', selector: '[data-testid="sidebar-collapse"]', viewports: ['desktop'] },
      { type: 'openTab', tab: 'settings', viewports: ['mobile'] },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page', viewports: ['mobile'] },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(1)', viewports: ['mobile'], optional: true },
      { type: 'waitForSelector', selector: '[data-settings-section="interface"][data-settings-variant="mobile"]', viewports: ['mobile'] },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'parameters',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-parameters"]' },
      { type: 'click', selector: '[data-testid="composer-parameters"]' },
      { type: 'waitForSelector', selector: '[data-testid="parameters-modal"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' },
      { type: 'closeModal', selector: '[data-testid="parameters-modal-close"]' }
    ]
  },

  {
    name: 'parameters-render',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-parameters"]' },
      { type: 'click', selector: '[data-testid="composer-parameters"]' },
      { type: 'waitForSelector', selector: '[data-testid="parameters-modal"]' },
      { type: 'click', selector: '[data-param-tab="render"]' },
      { type: 'waitForSelector', selector: '[data-param-slot="composer/parameters/render"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' },
      { type: 'closeModal', selector: '[data-testid="parameters-modal-close"]' }
    ]
  },
  {
    name: 'parameters-output',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-parameters"]' },
      { type: 'click', selector: '[data-testid="composer-parameters"]' },
      { type: 'waitForSelector', selector: '[data-testid="parameters-modal"]' },
      { type: 'click', selector: '[data-param-tab="output"]' },
      { type: 'waitForSelector', selector: '[data-param-slot="composer/parameters/output"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' },
      { type: 'closeModal', selector: '[data-testid="parameters-modal-close"]' }
    ]
  },
  {
    name: 'parameters-service',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-parameters"]' },
      { type: 'click', selector: '[data-testid="composer-parameters"]' },
      { type: 'waitForSelector', selector: '[data-testid="parameters-modal"]' },
      { type: 'click', selector: '[data-param-tab="service"]' },
      { type: 'waitForSelector', selector: '[data-param-slot="composer/parameters/service"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' },
      { type: 'closeModal', selector: '[data-testid="parameters-modal-close"]' }
    ]
  },
  {
    name: 'parameters-retry',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-parameters"]' },
      { type: 'click', selector: '[data-testid="composer-parameters"]' },
      { type: 'waitForSelector', selector: '[data-testid="parameters-modal"]' },
      { type: 'click', selector: '[data-param-tab="retry"]' },
      { type: 'waitForSelector', selector: '[data-param-slot="composer/parameters/retry"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' },
      { type: 'closeModal', selector: '[data-testid="parameters-modal-close"]' }
    ]
  },
  {
    name: 'batch-composer',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-batch"]' },
      { type: 'click', selector: '[data-testid="composer-batch"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-composer-stage"], .batch-composer-stage' },
      { type: 'wait', ms: 250 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'batch-composer-scrolled',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]', optional: true },
      { type: 'click', selector: '[data-testid="composer-batch"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="batch-composer-stage"], .batch-composer-stage' },
      { type: 'scroll', y: 420 },
      { type: 'wait', ms: 180 },
      { type: 'screenshot' },
      { type: 'scroll', y: 0 },
      { type: 'click', selector: '[data-testid="batch-composer-close"], .batch-composer-topbar > .btn-secondary', optional: true }
    ]
  },
  {
    name: 'batch-composer-controls',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-batch"]' },
      { type: 'click', selector: '[data-testid="composer-batch"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'click', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'wait', ms: 240 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'batch-request-presets',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-batch"]' },
      { type: 'click', selector: '[data-testid="composer-batch"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'click', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-request-presets-open"]' },
      { type: 'click', selector: '[data-testid="batch-request-presets-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="request-presets-panel"]' },
      { type: 'wait', ms: 240 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'batch-comfy-controls',
    seedSettings: seedData.comfySettings,
    seedParams: {
      providerParams: { comfyui: { checkpoint: 'dream-local.safetensors', width: 1024, height: 1024, batchSize: 1, steps: 24, cfg: 6.5, samplerName: 'euler', scheduler: 'normal', seedMode: 'random', seed: 1, denoise: 1, negativePrompt: '', filenamePrefix: 'ImageStudio', loras: [] } }
    },
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-batch"]' },
      { type: 'click', selector: '[data-testid="composer-batch"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'click', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-draft-comfy-loras"]' },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'batch-model-picker',
    steps: [
      { type: 'click', selector: '[data-testid="composer-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="composer-batch"]' },
      { type: 'click', selector: '[data-testid="composer-batch"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'click', selector: '[data-testid="batch-draft-controls"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-draft-model-picker"]' },
      { type: 'click', selector: '[data-testid="batch-draft-model-picker"]' },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'settings-integrations-empty',
    integrationApiFixture: telegramApiFixture(),
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(3), [data-testid="settings-tab-rail"] button:nth-child(3)', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-telegram-panel"]' },
      { type: 'wait', ms: 320 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'settings-integrations',
    integrationApiFixture: telegramApiFixture({ saved: true, running: true }),
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(3), [data-testid="settings-tab-rail"] button:nth-child(3)', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-telegram-panel"]' },
      { type: 'wait', ms: 320 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'settings-integrations-validation-error',
    integrationApiFixture: telegramApiFixture({ saved: true, validationFails: true }),
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(3), [data-testid="settings-tab-rail"] button:nth-child(3)', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-telegram-panel"]' },
      { type: 'click', selector: '[data-testid="settings-telegram-validate-token"]' },
      { type: 'wait', ms: 420 },
      { type: 'scrollToSelector', selector: '[data-testid="settings-telegram-validate-token"]' },
      { type: 'wait', ms: 180 },
      { type: 'screenshot' },
      { type: 'scroll', y: 0 }
    ]
  },
  {
    name: 'settings-api',
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'wait', ms: 250 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'settings-interface',
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(1), [data-testid="settings-tab-rail"] button:nth-child(1), .settings-mobile-tabs button:nth-child(1), .settings-tab-rail button:nth-child(1)', optional: true },
      { type: 'wait', ms: 250 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'settings-models',
    assertSelector: '[data-testid="settings-api-focus"] button:nth-child(2)[aria-selected="true"]',
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(2), [data-testid="settings-tab-rail"] button:nth-child(2)', optional: true },
      { type: 'click', selector: '[data-testid="settings-api-focus"] button:nth-child(2)', optional: true },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'settings-comfyui',
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(2), [data-testid="settings-tab-rail"] button:nth-child(2)', optional: true },
      { type: 'click', selector: '[data-testid="settings-api-focus"] button:nth-child(3)', optional: true },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'settings-comfyui-provider',
    steps: [
      { type: 'openTab', tab: 'settings' },
      { type: 'click', selector: '[data-testid="mobile-drawer-backdrop"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-page"], .workspace-settings-page' },
      { type: 'click', selector: '[data-testid="settings-mobile-tabs"] button:nth-child(2), [data-testid="settings-tab-rail"] button:nth-child(2)', optional: true },
      { type: 'click', selector: '[data-testid="settings-api-focus"] button:nth-child(3)', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="settings-comfy-add-provider"]' },
      { type: 'click', selector: '[data-testid="settings-comfy-add-provider"]' },
      { type: 'waitForSelector', selector: '[data-testid="settings-comfy-add-lora"]' },
      { type: 'click', selector: '[data-testid="settings-comfy-add-lora"]' },
      { type: 'wait', ms: 260 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'info',
    steps: [
      { type: 'openTab', tab: 'info' },
      { type: 'waitForSelector', selector: '.workspace-info-page' },
      { type: 'wait', ms: 250 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'attachment-preview-modal',
    assertSelector: '[data-testid="attachment-preview-modal"]',
    steps: [
      { type: 'openTab', tab: 'images' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-card-open"]' },
      { type: 'click', selector: '[data-testid="gallery-card-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="detail-page"]' },
      { type: 'click', selector: '[data-testid="detail-tab-files"]', optional: true },
      { type: 'waitForSelector', selector: '[data-testid="attachment-preview-open"]' },
      { type: 'click', selector: '[data-testid="attachment-preview-open"]' },
      { type: 'waitForSelector', selector: '[role="dialog"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },

  {
    name: 'detail-comfy',
    seedTasks: comfyDetailTasks,
    seedSettings: seedData.comfySettings,
    steps: [
      { type: 'openTab', tab: 'images' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-card-open"]' },
      { type: 'click', selector: '[data-testid="gallery-card-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="detail-page"]' },
      { type: 'wait', ms: 240 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'detail-comfy-technical',
    seedTasks: comfyDetailTasks,
    seedSettings: seedData.comfySettings,
    steps: [
      { type: 'openTab', tab: 'images' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-card-open"]' },
      { type: 'click', selector: '[data-testid="gallery-card-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="detail-page"]' },
      { type: 'click', selector: '[data-testid="detail-tab-technical"]', optional: true },
      { type: 'wait', ms: 240 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'detail',
    steps: [
      { type: 'openTab', tab: 'images' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-card-open"]' },
      { type: 'click', selector: '[data-testid="gallery-card-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="detail-page"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'detail-technical',
    steps: [
      { type: 'openTab', tab: 'images' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-card-open"]' },
      { type: 'click', selector: '[data-testid="gallery-card-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="detail-page"]' },
      { type: 'click', selector: '[data-testid="detail-tab-technical"]', optional: true },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  }
];
