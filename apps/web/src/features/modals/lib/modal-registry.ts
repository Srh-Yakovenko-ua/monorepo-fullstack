import type { ComponentType, LazyExoticComponent } from "react";

import { lazy } from "react";

export const ModalId = {
  Confirm: "confirm",
} as const;

export type ModalId = (typeof ModalId)[keyof typeof ModalId];

export type ModalPayloads = {
  [ModalId.Confirm]: {
    cancelLabel?: string;
    confirmLabel?: string;
    description?: string;
    onCancel?: () => void;
    onConfirm: () => Promise<void> | void;
    title: string;
    tone?: "default" | "destructive";
  };
};

type ModalComponent<K extends ModalId> = ComponentType<{
  isOpen: boolean;
  props: ModalPayloads[K];
}>;

const ConfirmModal = lazy(() =>
  import("../components/confirm-modal").then((m) => ({ default: m.ConfirmModal })),
);

export const modalComponents: {
  [K in ModalId]: LazyExoticComponent<ModalComponent<K>>;
} = {
  [ModalId.Confirm]: ConfirmModal,
};
