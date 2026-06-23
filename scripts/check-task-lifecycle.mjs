#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverRuntimeFiles = [
  'server/processes/generationTaskRuntime.ts',
  'server/processes/generation-task-runtime/index.ts',
  'server/processes/generation-task-runtime/runtimeStore.ts',
  'server/processes/generation-task-runtime/taskEvents.ts',
  'server/processes/generation-task-runtime/singleRun.ts',
  'server/processes/generation-task-runtime/batchRun.ts',
  'server/processes/generation-task-runtime/providerPipeline.ts',
  'server/processes/generation-task-runtime/cancellation.ts',
  'server/processes/generation-task-runtime/galleryMutations.ts',
  'server/processes/generation-task-runtime/imageState.ts'
];
const requiredFiles = [
  'src/processes/generation-task-lifecycle/status.ts',
  'src/processes/generation-task-lifecycle/transitions.ts',
  'src/processes/generation-task-lifecycle/cancellationRegistry.ts',
  'src/processes/generation-task-lifecycle/scheduler.ts',
  'src/processes/generation-task-lifecycle/retryPolicy.ts',
  ...serverRuntimeFiles
];
const legacyClientSubmit = 'submitImage' + 'Request';

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

async function readCombined(files) {
  const parts = await Promise.all(files.map(read));
  return parts.join('\n');
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

  const serverRuntimeFacade = await read('server/processes/generationTaskRuntime.ts');
  assert(serverRuntimeFacade.includes("./generation-task-runtime/index"), 'server runtime facade does not point at split runtime modules.');

  const serverRuntime = await readCombined(serverRuntimeFiles);
  assert(serverRuntime.includes('runGenerationRequestPipeline'), 'server runtime does not own the provider request pipeline.');
  assert(serverRuntime.includes('createRunnerRetryPolicy') && serverRuntime.includes('runWithRetryPolicy'), 'server runtime does not use the shared retry policy.');
  assert(serverRuntime.includes('runDelayedParallelScheduler'), 'server runtime batch path does not use the delayed parallel scheduler abstraction.');
  assert(
    serverRuntime.includes("transitionTask(task, 'sending'")
      && serverRuntime.includes("transitionTask(task, 'running'")
      && serverRuntime.includes("transitionTask(task, 'retrying'"),
    'server runtime does not publish explicit sending/running/retrying transitions for single tasks.'
  );
  assert(
    serverRuntime.includes("cancelled ? 'cancelled' : 'failed'")
      && serverRuntime.includes("transitionTask(task, 'cancelled'"),
    'server runtime does not persist cancelled status for failed/cancelled single tasks.'
  );
  assert(
    serverRuntime.includes("type: 'item-sending'")
      && serverRuntime.includes("type: 'item-running'")
      && serverRuntime.includes("type: 'item-retrying'"),
    'server runtime does not publish explicit sending/running/retrying transitions for batch items.'
  );
  assert(
    serverRuntime.includes("type: 'item-cancelled'")
      && serverRuntime.includes("type: 'item-failed'"),
    'server runtime does not persist failed/cancelled batch item terminal transitions.'
  );
  assert(serverRuntime.includes('subscribeGenerationTaskEvents') && serverRuntime.includes("'tasks-delta'"), 'server runtime split does not preserve SSE task delta publication.');
  assert(serverRuntime.includes('saveGenerationTaskHistoryDocuments') && serverRuntime.includes('loadGenerationTaskHistoryDocuments'), 'server runtime split does not preserve persisted task history ownership.');
  assert(serverRuntime.includes('moveServerGalleryFolderTasks') && serverRuntime.includes('pasteServerGalleryItems'), 'server runtime split does not preserve gallery task mutations.');

  const batchTaskReducer = await read('src/processes/batch-runner/batchTaskReducer.ts');
  assert(
    batchTaskReducer.includes("status: 'sending'")
      && batchTaskReducer.includes("status: 'running'")
      && batchTaskReducer.includes("status: 'retrying'")
      && batchTaskReducer.includes("status: 'cancelled'")
      && batchTaskReducer.includes("status: 'failed'"),
    'batch task reducer does not support the server-owned lifecycle statuses.'
  );

  const singleRunner = await read('src/processes/generation-runner/singleRunner.ts');
  assert(singleRunner.includes('enqueueServerGenerationRequest'), 'client single runner is not reduced to server-owned enqueue wiring.');
  assert(!singleRunner.includes(`${legacyClientSubmit}(`), 'client single runner still calls legacy provider submit as lifecycle truth.');

  const clientBatchRunner = await read('src/processes/batch-runner/batchRunner.ts');
  assert(clientBatchRunner.includes('Legacy client-side direct batch runner quarantine'), 'client direct batch runner is not explicitly quarantined.');
  assert(!clientBatchRunner.includes(`${legacyClientSubmit}(`), 'client batch runner still calls legacy provider submit as lifecycle truth.');

  const clientApi = await read('src/infrastructure/api.ts');
  assert(!clientApi.includes(`export async function ${legacyClientSubmit}`), 'client API still exports direct provider submit as a production path.');

  const historyHook = await read('src/app/hooks/useGenerationTaskHistory.ts');
  assert(historyHook.includes('createTaskCancellationRegistry'), 'task history hook does not use the cancellation registry for legacy local work.');
  assert(historyHook.includes('.cancel(taskId)'), 'deleteTask does not cancel active work before removal.');
  assert(historyHook.includes('.cancelAll()'), 'clearTasks does not cancel active work before clearing.');

  const storage = await read('src/entities/storage/generationTasks.ts');
  assert(storage.includes('interruptedStatusToFailed'), 'storage restore does not normalize interrupted active tasks.');
  assert(storage.includes('normalizeGenerationStatus'), 'storage restore does not use lifecycle status normalization.');

  const retry = await read('src/processes/generation-task-lifecycle/retryPolicy.ts');
  assert(retry.includes('runWithRetryPolicy'), 'shared lifecycle retry policy is missing.');

  console.log('Task lifecycle architecture summary:');
  console.log(`  ${expectedStatuses.length} persisted lifecycle statuses`);
  console.log(`  ${serverRuntimeFiles.length} server runtime facade/modules`);
  console.log('  server-owned runtime is the lifecycle owner for single and batch generation');
  console.log('  client single generation is snapshot/enqueue-only');
  console.log('  legacy client direct batch runner is quarantined');
  console.log('  delayed parallel scheduler enabled for server batch sends');
  console.log('  shared retry policy enabled for server runtime requests');
  console.log('Task lifecycle check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
