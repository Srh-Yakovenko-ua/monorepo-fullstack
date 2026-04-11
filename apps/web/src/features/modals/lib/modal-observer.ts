import type { ModalId, ModalPayloads } from "./modal-registry";

import { createSubscription } from "./create-subscription";

export type ModalEntry<K extends ModalId = ModalId> = {
  isOpen: boolean;
  props: ModalPayloads[K];
};

export type ModalEvent = {
  [K in ModalId]: { entry: ModalEntry<K> | undefined; id: K };
}[ModalId];

type ModalMap = { [K in ModalId]?: ModalEntry<K> };

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

function createModalObserver(): ModalObserver {
  const subscription = createSubscription<ModalEvent>();

  const mapper = new Proxy({} as ModalMap, {
    set(target, prop, value) {
      const id = prop as ModalId;
      if (value === undefined) {
        delete target[id];
      } else {
        (target as Record<string, unknown>)[id] = value;
      }
      subscription.emit({ entry: value, id } as ModalEvent);
      return true;
    },
  });

  const addModal: ModalObserver["addModal"] = (id, props) => {
    const existing = mapper[id];
    if (existing) {
      (mapper as Record<string, unknown>)[id] = { ...existing, isOpen: true };
    } else {
      (mapper as Record<string, unknown>)[id] = { isOpen: true, props };
    }
  };

  const openModal: ModalObserver["openModal"] = (id) => {
    const current = mapper[id];
    (mapper as Record<string, unknown>)[id] = { ...current, isOpen: true };
  };

  const removeModal: ModalObserver["removeModal"] = (id) => {
    (mapper as Record<string, unknown>)[id] = undefined;
  };

  const removeAllModals: ModalObserver["removeAllModals"] = () => {
    (Object.keys(mapper) as ModalId[]).forEach((id) => {
      (mapper as Record<string, unknown>)[id] = undefined;
    });
  };

  const closeModal: ModalObserver["closeModal"] = (id) => {
    (mapper as Record<string, unknown>)[id] = undefined;
  };

  const closeAllModals: ModalObserver["closeAllModals"] = () => {
    (Object.keys(mapper) as ModalId[]).forEach((id) => {
      const current = mapper[id];
      if (current?.isOpen) {
        (mapper as Record<string, unknown>)[id] = { ...current, isOpen: false };
      }
    });
  };

  const updateModalProps: ModalObserver["updateModalProps"] = (id, patch) => {
    const current = mapper[id];
    if (!current) return;
    (mapper as Record<string, unknown>)[id] = {
      ...current,
      props: { ...current.props, ...patch },
    };
  };

  const replaceModalProps: ModalObserver["replaceModalProps"] = (id, props) => {
    const current = mapper[id];
    if (!current) return;
    (mapper as Record<string, unknown>)[id] = { ...current, props };
  };

  const findModal: ModalObserver["findModal"] = (id) => {
    return mapper[id] as ModalEntry<typeof id> | undefined;
  };

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
