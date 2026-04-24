import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { modalObserver } from "@/features/modals/lib/modal-observer";
import { ModalId, type ModalPayloads } from "@/features/modals/lib/modal-registry";

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.RegistrationSuccess];
};

export function RegistrationSuccessDialog({ isOpen, props }: Props) {
  const { t } = useTranslation();

  function handleClose() {
    modalObserver.removeModal(ModalId.RegistrationSuccess);
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("registration.successDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("registration.successDialog.description", { email: props.email })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={handleClose}>{t("registration.successDialog.ok")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
