import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { modalObserver } from "@/features/modals/lib/modal-observer";
import { ModalId, type ModalPayloads } from "@/features/modals/lib/modal-registry";

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.PasswordRecoverySuccess];
};

export function RecoverySuccessDialog({ isOpen }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function handleClose() {
    modalObserver.removeModal(ModalId.PasswordRecoverySuccess);
    void navigate("/login", { replace: true });
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("passwordRecovery.successDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={handleClose}>{t("passwordRecovery.successDialog.ok")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
