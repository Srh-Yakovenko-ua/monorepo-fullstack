import type { ModalId, ModalPayloads } from "./modal-registry";

import { createSubscription } from "./create-subscription";

export type ModalEntry<K extends ModalId = ModalId> = {
  isOpen: boolean;
  props: ModalPayloads[K];
};

export type ModalEvent = {
  [K in ModalId]: { entry: ModalEntry<K> | undefined; id: K };
}[ModalId];

type ModalObserver = {
  addModal: <K extends ModalId>(id: K, props: ModalPayloads[K]) => void;
  closeAllModals: () => void;
  closeModal: (id: ModalId) => void;
  findModal: <K extends ModalId>(id: K) => ModalEntry<K> | undefined;
  openModal: (id: ModalId) => void;
  removeAllModals: () => void;
  removeModal: (id: ModalId) => void;
  replaceModalProps: <K extends ModalId>(id: K, props: ModalPayloads[K]) => void;
  subscribe: (handler: (event: ModalEvent) => void) => () => void;
  unsubscribe: (handler: (event: ModalEvent) => void) => void;
  updateModalProps: <K extends ModalId>(id: K, patch: Partial<ModalPayloads[K]>) => void;
};

function buildEvent<K extends ModalId>(id: K, entry: ModalEntry<K> | undefined): ModalEvent {
  return { entry, id } as ModalEvent;
}

function createModalObserver(): ModalObserver {
  const subscription = createSubscription<ModalEvent>();
  const store = new Map<ModalId, ModalEntry>();

  function readEntry<K extends ModalId>(id: K): ModalEntry<K> | undefined {
    const entry = store.get(id);
    if (!entry) return undefined;
    return entry as ModalEntry<K>;
  }

  function writeEntry<K extends ModalId>(id: K, entry: ModalEntry<K>): void {
    store.set(id, entry);
    subscription.emit(buildEvent(id, entry));
  }

  function clearEntry(id: ModalId): void {
    if (!store.has(id)) return;
    store.delete(id);
    subscription.emit(buildEvent(id, undefined));
  }

  const addModal: ModalObserver["addModal"] = (id, props) => {
    const existing = readEntry(id);
    if (existing) {
      writeEntry(id, { ...existing, isOpen: true });
    } else {
      writeEntry(id, { isOpen: true, props });
    }
  };

  const openModal: ModalObserver["openModal"] = (id) => {
    const current = readEntry(id);
    if (!current) return;
    writeEntry(id, { ...current, isOpen: true });
  };

  const removeModal: ModalObserver["removeModal"] = (id) => {
    clearEntry(id);
  };

  const removeAllModals: ModalObserver["removeAllModals"] = () => {
    const ids = Array.from(store.keys());
    ids.forEach((id) => clearEntry(id));
  };

  const closeModal: ModalObserver["closeModal"] = (id) => {
    clearEntry(id);
  };

  const closeAllModals: ModalObserver["closeAllModals"] = () => {
    store.forEach((current, id) => {
      if (current.isOpen) {
        writeEntry(id, { ...current, isOpen: false });
      }
    });
  };

  const updateModalProps: ModalObserver["updateModalProps"] = (id, patch) => {
    const current = readEntry(id);
    if (!current) return;
    writeEntry(id, { ...current, props: { ...current.props, ...patch } });
  };

  const replaceModalProps: ModalObserver["replaceModalProps"] = (id, props) => {
    const current = readEntry(id);
    if (!current) return;
    writeEntry(id, { ...current, props });
  };

  const findModal: ModalObserver["findModal"] = (id) => readEntry(id);

  return {
    addModal,
    closeAllModals,
    closeModal,
    findModal,
    openModal,
    removeAllModals,
    removeModal,
    replaceModalProps,
    subscribe: subscription.subscribe,
    unsubscribe: subscription.unsubscribe,
    updateModalProps,
  };
}

export const modalObserver = createModalObserver();
