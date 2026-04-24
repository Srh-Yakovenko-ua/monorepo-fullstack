import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { modalObserver } from "../lib/modal-observer";
import { ModalId, type ModalPayloads } from "../lib/modal-registry";

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.Confirm];
};

export function ConfirmModal({ isOpen, props }: Props) {
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await props.onConfirm();
      modalObserver.removeModal(ModalId.Confirm);
    } finally {
      setPending(false);
    }
  };

  const handleCancel = () => {
    props.onCancel?.();
    modalObserver.removeModal(ModalId.Confirm);
  };

  function handleOpenChange(open: boolean) {
    if (!open) handleCancel();
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description ? <DialogDescription>{props.description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button disabled={pending} onClick={handleCancel} variant="outline">
            {props.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            loading={pending}
            onClick={handleConfirm}
            variant={props.tone === "destructive" ? "destructive" : "default"}
          >
            {props.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
