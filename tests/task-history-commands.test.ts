import test from 'node:test';
import assert from 'node:assert/strict';
import { clearTasksCommand, deleteTaskCommand } from '../src/app/commands/workspaceCommands';

function createNavigation() {
  const selectedTasks: Array<string | null> = [];
  const selectedImages: Array<string | null> = [];
  return {
    selectedTasks,
    selectedImages,
    navigation: {
      setSelectedTaskId(value: string | null | ((current: string | null) => string | null)) {
        selectedTasks.push(typeof value === 'function' ? value(null) : value);
      },
      setSelectedImageId(value: string | null | ((current: string | null) => string | null)) {
        selectedImages.push(typeof value === 'function' ? value(null) : value);
      }
    }
  };
}

test('delete failure leaves projection and selection unchanged', async () => {
  const deleted: string[] = [];
  const navigation = createNavigation();

  await assert.rejects(
    deleteTaskCommand({
      taskId: 'task-a',
      selectedTaskId: 'task-a',
      navigation: navigation.navigation,
      taskHistory: { deleteTask: (taskId) => deleted.push(taskId) },
      serverActions: { deleteTask: async () => { throw new Error('server delete failed'); } }
    }),
    /server delete failed/
  );

  assert.deepEqual(deleted, []);
  assert.deepEqual(navigation.selectedTasks, []);
  assert.deepEqual(navigation.selectedImages, []);
});

test('delete success updates projection and selection only after server confirmation', async () => {
  let resolveDelete!: () => void;
  const pending = new Promise<void>((resolve) => { resolveDelete = resolve; });
  const events: string[] = [];
  const navigation = createNavigation();

  const command = deleteTaskCommand({
    taskId: 'task-a',
    selectedTaskId: 'task-a',
    navigation: {
      setSelectedTaskId(value) {
        events.push(`task:${typeof value === 'function' ? value(null) : value}`);
      },
      setSelectedImageId(value) {
        events.push(`image:${typeof value === 'function' ? value(null) : value}`);
      }
    },
    taskHistory: { deleteTask: (taskId) => events.push(`projection:${taskId}`) },
    serverActions: { deleteTask: () => pending }
  });

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(events, []);
  resolveDelete();
  await command;
  assert.deepEqual(events, ['projection:task-a', 'task:null', 'image:null']);
});

test('clear failure leaves tasks and selection unchanged', async () => {
  let cleared = 0;
  const navigation = createNavigation();

  await assert.rejects(
    clearTasksCommand({
      navigation: navigation.navigation,
      taskHistory: { clearTasks: () => { cleared += 1; } },
      serverActions: { clearTasks: async () => { throw new Error('server clear failed'); } }
    }),
    /server clear failed/
  );

  assert.equal(cleared, 0);
  assert.deepEqual(navigation.selectedTasks, []);
  assert.deepEqual(navigation.selectedImages, []);
});
