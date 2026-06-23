/**
 * Legacy client-side direct batch runner quarantine.
 *
 * Production batch/multi generation is server-owned:
 * UI/client code prepares snapshots and enqueues through
 * `enqueueServerBatchGenerationRequest`, while provider submission,
 * streaming, retry, cancellation, and task lifecycle transitions live in
 * `server/processes/generation-task-runtime/*`.
 *
 * Keep this module as an intentional tombstone so future maintenance does
 * not revive browser-side direct provider submission as a lifecycle owner.
 */
export async function runBatchGeneration(): Promise<never> {
  throw new Error(
    'Legacy client-side direct batch runner is quarantined. Use the server-owned enqueue path instead.'
  );
}
