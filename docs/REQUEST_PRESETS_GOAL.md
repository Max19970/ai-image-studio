# Goal: Request Presets

Implement saved request presets for Image Studio.

A preset captures a reusable request setup:

- prompt;
- selected model;
- provider generation mode;
- generation parameters, including provider-specific values;
- display metadata for provider, model, and mode labels.

Presets must use the existing local-first storage direction: local fallback plus encrypted app document storage.

User-facing requirements:

- save current request as a preset;
- apply a preset to restore the request setup;
- edit saved presets;
- delete saved presets;
- keep desktop and mobile UI compact and organic.

Scope note: this stage restores request configuration, not uploaded file objects.
