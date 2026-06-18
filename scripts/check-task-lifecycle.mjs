#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'src/processes/generation-task-lifecycle/status.ts',
  'src/processes/generation-task-lifecycle/transitions.ts',
  'src/processes/generation-task-lifecycle/cancellationRegistry.ts',
  'src/processes/generation-task-lifecycle/scheduler.ts',
  'src/processes/generation-task-lifecycle/retryPolicy.ts'
];

const expectedStatuses = ['created', 'queued', 'sending', 'running', 'retrying', 'succeeded', 'failed', 'cancelled'];

async function read(file) {
  return fs.readFile(path.join(root, file), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Task lifecycle check failed: ${message}`);
    process.exit(1);
  }
}

async function main() {
  for (const file of requiredFiles) {
    await fs.access(path.join(root, file));
  }

  const domainTypes = await read('src/domain/generationTask.ts');
  for (const status of expectedStatuses) {
    assert(domainTypes.includes(`'${status}'`), `GenerationStatus is missing '${status}'.`);
  }
  assert(!domainTypes.includes("'streaming' |"), "GenerationStatus still exposes legacy 'streaming'.");

  const singleRunner = await read('src/processes/generation-runner/singleRunner.ts');
  const batchRunner = await read('src/processes/batch-runner/batchRunner.ts');
  const batchTaskReducer = await read('src/processes/batch-runner/batchTaskReducer.ts');
  assert(singleRunner.includes("status: 'sending'") && singleRunner.includes("status: 'running'") && singleRunner.includes("status: 'retrying'"), 'single runner does not use explicit sending/running/retrying transitions.');
  assert(singleRunner.includes("status: failure.cancelled ? 'cancelled' : 'failed'"), 'single runner does not persist cancelled status.');
  assert(batchRunner.includes('runDelayedParallelScheduler'), 'batch runner does not use the delayed parallel scheduler abstraction.');
  assert(
    batchRunner.includes("failure.cancelled ? 'item-cancelled' : 'item-failed'")
      && batchTaskReducer.includes("status: 'cancelled'")
      && batchTaskReducer.includes("status: 'failed'"),
    'batch item failures do not persist cancelled status.'
  );

  const historyHook = await read('src/app/hooks/useGenerationTaskHistory.ts');
  assert(historyHook.includes('createTaskCancellationRegistry'), 'task history hook does not use the cancellation registry.');
  assert(historyHook.includes('.cancel(taskId)'), 'deleteTask does not cancel active work before removal.');
  assert(historyHook.includes('.cancelAll()'), 'clearTasks does not cancel active work before clearing.');

  const storage = await read('src/entities/storage/generationTasks.ts');
  assert(storage.includes('interruptedStatusToFailed'), 'storage restore does not normalize interrupted active tasks.');
  assert(storage.includes('normalizeGenerationStatus'), 'storage restore does not use lifecycle status normalization.');

  const retry = await read('src/processes/generation-task-lifecycle/retryPolicy.ts');
  assert(retry.includes('runWithRetryPolicy'), 'shared lifecycle retry policy is missing.');

  console.log('Task lifecycle architecture summary:');
  console.log(`  ${expectedStatuses.length} persisted lifecycle statuses`);
  console.log(`  ${requiredFiles.length} lifecycle modules`);
  console.log('  delayed parallel scheduler enabled for batch sends');
  console.log('  shared retry policy enabled for mono and batch');
  console.log('Task lifecycle check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
