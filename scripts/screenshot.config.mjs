const now = Date.now();

export const viewports = {
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

export const seedData = {
  paramsKey: 'gpt-image-2-studio.params.v2',
  tasksKey: 'image-studio.generation-tasks.v1',
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

export const scenarios = [
  { name: 'gallery', steps: [{ type: 'screenshot' }] },
  {
    name: 'sidebar-collapsed',
    steps: [
      { type: 'click', selector: '[data-testid="sidebar-collapse"], [data-testid="mobile-drawer-trigger"]' },
      { type: 'wait', ms: 220 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'parameters',
    steps: [
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
      { type: 'click', selector: '[data-testid="composer-batch"]' },
      { type: 'waitForSelector', selector: '[data-testid="batch-composer-stage"], .batch-composer-stage' },
      { type: 'wait', ms: 250 },
      { type: 'screenshot' }
    ]
  },
  {
    name: 'batch-composer-scrolled',
    steps: [
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
    steps: [
      { type: 'openTab', tab: 'images' },
      { type: 'waitForSelector', selector: '[data-testid="gallery-card-open"]' },
      { type: 'click', selector: '[data-testid="gallery-card-open"]' },
      { type: 'waitForSelector', selector: '[data-testid="detail-page"]' },
      { type: 'waitForSelector', selector: '[data-testid="attachment-preview-open"]' },
      { type: 'click', selector: '[data-testid="attachment-preview-open"]' },
      { type: 'waitForSelector', selector: '[role="dialog"]' },
      { type: 'wait', ms: 220 },
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
  }
];
