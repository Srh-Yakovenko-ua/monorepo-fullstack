import type { PasswordRecoveryInput } from "@app/shared";
import type { z } from "zod";

import { PasswordRecoveryInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modalObserver } from "@/features/modals/lib/modal-observer";
import { ModalId, type ModalPayloads } from "@/features/modals/lib/modal-registry";
import { usePasswordRecovery } from "@/features/password-recovery/hooks/use-password-recovery";
import { applyFieldErrors, toastApiError } from "@/lib/api-errors";

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.ResendRecovery];
};

type ResendRecoveryFormValues = z.infer<typeof PasswordRecoveryInputSchema>;

export function ResendRecoveryDialog({ isOpen, props }: Props) {
  const { t } = useTranslation();
  const recover = usePasswordRecovery();

  const form = useForm<ResendRecoveryFormValues>({
    defaultValues: { email: props.initialEmail ?? "" },
    resolver: zodResolver(PasswordRecoveryInputSchema),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ email: props.initialEmail ?? "" });
    }
  }, [isOpen, props.initialEmail, form]);

  const isPending = form.formState.isSubmitting;

  function handleClose() {
    modalObserver.removeModal(ModalId.ResendRecovery);
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  async function onSubmit({ email }: PasswordRecoveryInput) {
    try {
      await recover.mutateAsync({ email });
      handleClose();
      toast.success(t("passwordRecovery.resendDialog.sentToast", { email }));
    } catch (err) {
      if (applyFieldErrors(form, err)) return;
      toastApiError(err, t("common.somethingWentWrong"));
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("passwordRecovery.resendDialog.title")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resend-recovery-email">
              {t("passwordRecovery.resendDialog.emailLabel")}
            </Label>
            <Input
              id="resend-recovery-email"
              placeholder="email@example.com"
              type="email"
              {...form.register("email")}
              aria-describedby={
                form.formState.errors.email ? "resend-recovery-email-error" : undefined
              }
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError error={form.formState.errors.email} id="resend-recovery-email-error" />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} type="button" variant="outline">
              {t("passwordRecovery.resendDialog.cancel")}
            </Button>
            <Button loading={isPending} type="submit">
              {t("passwordRecovery.resendDialog.send")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
