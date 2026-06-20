# Dev image CLI

Name: dev-image-cli

Description: Use when Image Studio development work requires creating image files for fixtures, visual checks, examples, datasets, or implementation testing. Use the project dev-only GPT Image CLI in background-log mode.

Use this skill inside the Image Studio project when a development task needs project image outputs.

## Core rule

For project development image tasks, use the local CLI:

```bash
node dev-only/gpt-image-cli.mjs
```

The CLI reads DEV-prefixed environment variables from `.env` or from the process environment. Never print `.env`, authorization headers, or secret-bearing command environments.

## Required background-log mode

For real requests, run the CLI in a background process and write stdout and stderr to a log file. Then poll the log with short commands until it contains either:

- an explicit error, failed attempt, or non-zero exit marker;
- successful saved-file records and `exit:0`.

This avoids losing results when DevSpace foreground command transport returns transient 502 errors during long-running calls.

## Temporary files

Put all temporary batch JSON files and background-process log files under:

```txt
dev-only/generated/images/tmp
```

Do not create temporary request JSON or log files in the project root.

Create the tmp directory before use if needed. After the run, delete temporary JSON and log files as soon as they are no longer useful.

Generated images and response metadata may remain in the configured output directory, usually `dev-only/generated/images`.

## Single request workflow

1. Create the tmp directory if needed.
2. Start `node dev-only/gpt-image-cli.mjs` in the background with normal single-request arguments.
3. Append stdout and stderr to a log file under the tmp directory.
4. Print PID and log path immediately.
5. Poll the log with short commands.
6. Confirm either success records plus `exit:0`, or an explicit error.
7. Remove temporary log files when no longer needed.

## Batch request workflow

1. Create the tmp directory if needed.
2. Write the temporary batch JSON under the tmp directory.
3. Start `node dev-only/gpt-image-cli.mjs --batch <tmp-json>` in the background.
4. Append stdout and stderr to a log file under the same tmp directory.
5. Print PID, batch path, and log path immediately.
6. Poll the log with short commands.
7. Confirm either success records plus `exit:0`, or an explicit error.
8. Remove the temporary batch JSON and log files when no longer needed.

Batch request completion order is not guaranteed. Later requests may finish before earlier ones because the CLI spaces request starts by `intervalMs`, while API processing continues concurrently.

## Reporting

Report only non-secret operational facts:

- command mode: single or batch;
- PID and log path if useful;
- whether the log ended with `exit:0` or an error;
- count of saved files and requests;
- output directory;
- any temporary files that could not be removed.

Do not paste base64 payloads from response JSON files.
