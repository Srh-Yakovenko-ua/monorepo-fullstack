import type { RegistrationEmailResendingInput } from "@app/shared";
import type { z } from "zod";

import { RegistrationEmailResendingInputSchema } from "@app/shared";
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
import { useResendConfirmation } from "@/features/registration/hooks/use-resend-confirmation";
import { applyFieldErrors, toastApiError } from "@/lib/api-errors";

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.ResendConfirmation];
};

type ResendFormValues = z.infer<typeof RegistrationEmailResendingInputSchema>;

export function ResendConfirmationDialog({ isOpen, props }: Props) {
  const { t } = useTranslation();
  const resend = useResendConfirmation();

  const form = useForm<ResendFormValues>({
    defaultValues: { email: props.initialEmail ?? "" },
    resolver: zodResolver(RegistrationEmailResendingInputSchema),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ email: props.initialEmail ?? "" });
    }
  }, [isOpen, props.initialEmail, form]);

  const isPending = form.formState.isSubmitting;

  function handleClose() {
    modalObserver.removeModal(ModalId.ResendConfirmation);
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  async function onSubmit({ email }: RegistrationEmailResendingInput) {
    try {
      await resend.mutateAsync({ email });
      handleClose();
      toast.success(t("registration.toasts.resent"));
    } catch (err) {
      if (applyFieldErrors(form, err)) return;
      toastApiError(err, t("registration.toasts.generic"));
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("registration.resendDialog.title")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resend-email">{t("registration.resendDialog.emailLabel")}</Label>
            <Input
              id="resend-email"
              placeholder="email@example.com"
              type="email"
              {...form.register("email")}
              aria-describedby={form.formState.errors.email ? "resend-email-error" : undefined}
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError error={form.formState.errors.email} id="resend-email-error" />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} type="button" variant="outline">
              {t("registration.resendDialog.cancel")}
            </Button>
            <Button loading={isPending} type="submit">
              {t("registration.resendDialog.send")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
