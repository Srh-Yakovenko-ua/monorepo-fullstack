import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AlreadyRegisteredDialogProps = {
  field: "email" | "login";
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function AlreadyRegisteredDialog({
  field,
  onOpenChange,
  open,
}: AlreadyRegisteredDialogProps) {
  const { t } = useTranslation();

  function handleOk() {
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {field === "email"
              ? t("registration.alreadyRegisteredDialog.title.email")
              : t("registration.alreadyRegisteredDialog.title.login")}
          </DialogTitle>
          <DialogDescription>
            {field === "email"
              ? t("registration.alreadyRegisteredDialog.description.email")
              : t("registration.alreadyRegisteredDialog.description.login")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={handleOk}>{t("registration.successDialog.ok")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
