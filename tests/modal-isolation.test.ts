import test from 'node:test';
import assert from 'node:assert/strict';
import { createModalIsolationManager, type ModalIsolationElement } from '../src/shared/hooks/modalIsolation';

class FakeElement implements ModalIsolationElement {
  private readonly attributes = new Map<string, string>();

  constructor(initialAttributes: Record<string, string> = {}) {
    for (const [name, value] of Object.entries(initialAttributes)) this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
}

function createBody(children: FakeElement[], overflow = '') {
  return {
    children,
    style: { overflow }
  };
}

test('nested modal isolation keeps the app locked until a child releases after its parent', () => {
  const manager = createModalIsolationManager<FakeElement>();
  const appRoot = new FakeElement();
  const parentModalRoot = new FakeElement();
  const childModalRoot = new FakeElement();
  const body = createBody([appRoot, parentModalRoot]);

  const releaseParent = manager.acquire(body, parentModalRoot);
  body.children.push(childModalRoot);
  const releaseChild = manager.acquire(body, childModalRoot);

  assert.equal(appRoot.getAttribute('inert'), '');
  assert.equal(parentModalRoot.getAttribute('inert'), '');
  assert.equal(body.style.overflow, 'hidden');

  releaseParent();
  assert.equal(appRoot.getAttribute('inert'), '');
  assert.equal(body.style.overflow, 'hidden');

  releaseChild();
  assert.equal(appRoot.getAttribute('inert'), null);
  assert.equal(appRoot.getAttribute('aria-hidden'), null);
  assert.equal(parentModalRoot.getAttribute('inert'), null);
  assert.equal(body.style.overflow, '');
});

test('modal isolation restores pre-existing attributes and body overflow', () => {
  const manager = createModalIsolationManager<FakeElement>();
  const appRoot = new FakeElement({ inert: 'persisted', 'aria-hidden': 'false' });
  const modalRoot = new FakeElement();
  const body = createBody([appRoot, modalRoot], 'clip');

  const release = manager.acquire(body, modalRoot);
  release();
  release();

  assert.equal(appRoot.getAttribute('inert'), 'persisted');
  assert.equal(appRoot.getAttribute('aria-hidden'), 'false');
  assert.equal(body.style.overflow, 'clip');
});
