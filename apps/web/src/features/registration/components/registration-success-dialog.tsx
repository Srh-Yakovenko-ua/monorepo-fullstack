import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RegistrationSuccessDialogProps = {
  email: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function RegistrationSuccessDialog({
  email,
  onOpenChange,
  open,
}: RegistrationSuccessDialogProps) {
  const { t } = useTranslation();

  function handleOk() {
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("registration.successDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("registration.successDialog.description", { email })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={handleOk}>{t("registration.successDialog.ok")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
