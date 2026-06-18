# Security

Image Studio is designed as a local-first personal tool. It is not a production SaaS backend.

## Local-first assumptions

- The default server host is `127.0.0.1`.
- Provider keys can come from `.env` or local UI settings.
- Generation history, thumbnails, settings, image params, and provider probe cache are stored in encrypted local SQLite documents.
- The app does not implement user accounts, multi-tenant access control, public abuse controls, or production request auditing.

Do not expose the server to the public internet unless you add authentication, authorization, production-grade secret management, request logging without secrets, rate limiting, abuse protection, deployment-specific CORS/CSRF hardening, and a clear data retention model.

## API keys and local data

- Keep real provider keys in a local `.env` or local UI settings only.
- Do not commit `.env`, `data/`, SQLite files, `storage.key`, screenshots with sensitive content, or generated private images.
- `IMAGE_STUDIO_STORAGE_KEY` may be used for deterministic encryption keys, but should not be committed.
- If `IMAGE_STUDIO_STORAGE_KEY` is omitted, Image Studio creates a local `data/storage.key` file automatically.

## Checks

Before publishing a branch or release archive, run:

```bash
npm run verify:static
```

This includes a basic secret scan. It can catch obvious keys, private key blocks, and bearer tokens, but it is not a substitute for manual review.

## Reporting issues

Open a GitHub issue with reproduction steps. Do not include real API keys, generated private images, local database files, `storage.key`, or other secrets in public reports.
