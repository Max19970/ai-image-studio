# Security

Image Studio is designed as a local-first personal tool. Do not expose the server to the public internet unless you add authentication, provider profiles, rate limiting, request auditing, and server-side secret storage suitable for your deployment.

## API keys

- Keep real provider keys in `.env` or in your local UI settings only.
- Do not commit `.env`, `data/`, `storage.key`, or SQLite files.
- The default server host is `127.0.0.1` to reduce accidental LAN exposure.

## Reporting issues

Please open a GitHub issue with reproduction steps. Do not include real API keys, generated private images, local database files, or other secrets in public reports.
