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
import { useResendConfirmation } from "@/features/registration/hooks/use-resend-confirmation";
import { applyFieldErrors, toastApiError } from "@/lib/api-errors";

type ResendConfirmationDialogProps = {
  initialEmail?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type ResendFormValues = z.infer<typeof RegistrationEmailResendingInputSchema>;

export function ResendConfirmationDialog({
  initialEmail,
  onOpenChange,
  open,
}: ResendConfirmationDialogProps) {
  const { t } = useTranslation();
  const resend = useResendConfirmation();

  const form = useForm<ResendFormValues>({
    defaultValues: { email: initialEmail ?? "" },
    resolver: zodResolver(RegistrationEmailResendingInputSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({ email: initialEmail ?? "" });
    }
  }, [open, initialEmail, form]);

  const isPending = form.formState.isSubmitting;

  async function onSubmit({ email }: RegistrationEmailResendingInput) {
    try {
      await resend.mutateAsync({ email });
      onOpenChange(false);
      toast.success(t("registration.toasts.resent"));
    } catch (err) {
      if (applyFieldErrors(form, err)) return;
      toastApiError(err, t("registration.toasts.generic"));
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
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
            <Button onClick={handleCancel} type="button" variant="outline">
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
