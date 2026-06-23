import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeGenerationTaskHistoryForClient } from '../server/processes/generationTaskHistoryClientSerialization';

test('generation task client serialization compacts heavy raw image payloads for SSE and history responses', () => {
  const [task] = serializeGenerationTaskHistoryForClient([{
    id: 'task-raw',
    raw: {
      data: [{ b64_json: 'A'.repeat(64), revised_prompt: 'done' }],
      nested: { result: 'B'.repeat(32) }
    },
    images: [{
      id: 'img-1',
      src: 'https://example.test/image.png',
      raw: { b64_json: 'C'.repeat(16) }
    }],
    batch: {
      items: [{
        id: 'item-1',
        raw: { partial_image_b64: 'D'.repeat(24) },
        images: [{ id: 'batch-img-1', src: 'https://example.test/batch.png', raw: { result: 'E'.repeat(8) } }]
      }]
    }
  }], 'full') as any[];

  assert.equal(task.raw.data[0].b64_json, '[omitted inline image payload: 64 chars]');
  assert.equal(task.raw.nested.result, '[omitted inline image payload: 32 chars]');
  assert.equal(task.images[0].raw.b64_json, '[omitted inline image payload: 16 chars]');
  assert.equal(task.batch.items[0].raw.partial_image_b64, '[omitted inline image payload: 24 chars]');
  assert.equal(task.batch.items[0].images[0].raw.result, '[omitted inline image payload: 8 chars]');
});
