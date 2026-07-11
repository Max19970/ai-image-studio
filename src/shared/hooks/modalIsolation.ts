export interface ModalIsolationElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export interface ModalIsolationBody<TElement extends ModalIsolationElement> {
  children: ArrayLike<TElement>;
  style: { overflow: string };
}

interface ElementLockState {
  count: number;
  inertAttribute: string | null;
  ariaHiddenAttribute: string | null;
}

interface BodyLockState {
  count: number;
  overflow: string;
}

export interface ModalIsolationManager<TElement extends ModalIsolationElement> {
  acquire(body: ModalIsolationBody<TElement>, modalRoot: TElement): () => void;
}

export function createModalIsolationManager<TElement extends ModalIsolationElement>(): ModalIsolationManager<TElement> {
  const elementLocks = new Map<TElement, ElementLockState>();
  const bodyLocks = new Map<ModalIsolationBody<TElement>, BodyLockState>();

  const lockElement = (element: TElement) => {
    const existing = elementLocks.get(element);
    if (existing) {
      existing.count += 1;
      return;
    }

    elementLocks.set(element, {
      count: 1,
      inertAttribute: element.getAttribute('inert'),
      ariaHiddenAttribute: element.getAttribute('aria-hidden')
    });
    element.setAttribute('inert', '');
    element.setAttribute('aria-hidden', 'true');
  };

  const unlockElement = (element: TElement) => {
    const state = elementLocks.get(element);
    if (!state) return;

    state.count -= 1;
    if (state.count > 0) return;

    elementLocks.delete(element);
    if (state.inertAttribute === null) element.removeAttribute('inert');
    else element.setAttribute('inert', state.inertAttribute);

    if (state.ariaHiddenAttribute === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', state.ariaHiddenAttribute);
  };

  const lockBody = (body: ModalIsolationBody<TElement>) => {
    const existing = bodyLocks.get(body);
    if (existing) {
      existing.count += 1;
      return;
    }

    bodyLocks.set(body, { count: 1, overflow: body.style.overflow });
    body.style.overflow = 'hidden';
  };

  const unlockBody = (body: ModalIsolationBody<TElement>) => {
    const state = bodyLocks.get(body);
    if (!state) return;

    state.count -= 1;
    if (state.count > 0) return;

    bodyLocks.delete(body);
    body.style.overflow = state.overflow;
  };

  return {
    acquire(body, modalRoot) {
      const lockedElements = Array.from(body.children).filter((element) => element !== modalRoot);
      lockedElements.forEach(lockElement);
      lockBody(body);

      let released = false;
      return () => {
        if (released) return;
        released = true;
        lockedElements.forEach(unlockElement);
        unlockBody(body);
      };
    }
  };
}
