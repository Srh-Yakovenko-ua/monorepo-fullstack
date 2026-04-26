import { NewPasswordInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalId, modalObserver } from "@/features/modals";
import { useNewPassword } from "@/features/password-recovery/hooks/use-new-password";
import { applyFieldErrors, hasFieldError, toastApiError } from "@/lib/api-errors";

type Props = {
  recoveryCode: string;
};

const newPasswordFormSchema = NewPasswordInputSchema.extend({
  passwordConfirmation: z.string().min(1, "passwordRecovery.newPassword.errors.confirmRequired"),
}).refine(({ newPassword, passwordConfirmation }) => newPassword === passwordConfirmation, {
  message: "passwordRecovery.newPassword.errors.mismatch",
  path: ["passwordConfirmation"],
});

type NewPasswordFormValues = z.infer<typeof newPasswordFormSchema>;

export function NewPasswordForm({ recoveryCode }: Props) {
  const { t } = useTranslation();
  const setNewPassword = useNewPassword();

  const [isExpired, setIsExpired] = useState(false);

  const form = useForm<NewPasswordFormValues>({
    defaultValues: { newPassword: "", passwordConfirmation: "", recoveryCode },
    resolver: zodResolver(newPasswordFormSchema),
  });

  const isPending = form.formState.isSubmitting;

  async function onSubmit({ newPassword }: NewPasswordFormValues) {
    try {
      await setNewPassword.mutateAsync({ newPassword, recoveryCode });
      modalObserver.addModal(ModalId.PasswordRecoverySuccess, {});
    } catch (err) {
      if (hasFieldError(err, "recoveryCode")) {
        setIsExpired(true);
        return;
      }
      if (applyFieldErrors(form, err)) return;
      toastApiError(err, t("common.somethingWentWrong"));
    }
  }

  function handleOpenResend() {
    modalObserver.addModal(ModalId.ResendRecovery, {});
  }

  if (isExpired) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm animate-in rounded-2xl border border-border/60 bg-card/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-md duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-muted-foreground">{t("passwordRecovery.expired.message")}</p>
            <Button onClick={handleOpenResend} type="button">
              {t("passwordRecovery.expired.resend")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in rounded-2xl border border-border/60 bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-md duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
        <div className="mb-6">
          <h1
            className="font-display text-2xl font-normal text-foreground"
            style={{ letterSpacing: "-0.025em" }}
          >
            {t("passwordRecovery.newPassword.title")}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("passwordRecovery.newPassword.subtitle")}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">
              {t("passwordRecovery.newPassword.newPasswordLabel")}
            </Label>
            <Input
              id="new-password"
              type="password"
              {...form.register("newPassword")}
              aria-describedby={
                form.formState.errors.newPassword ? "new-password-error" : undefined
              }
              aria-invalid={!!form.formState.errors.newPassword}
            />
            <FieldError error={form.formState.errors.newPassword} id="new-password-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-confirmation">
              {t("passwordRecovery.newPassword.confirmLabel")}
            </Label>
            <Input
              id="password-confirmation"
              type="password"
              {...form.register("passwordConfirmation")}
              aria-describedby={
                form.formState.errors.passwordConfirmation
                  ? "password-confirmation-error"
                  : undefined
              }
              aria-invalid={!!form.formState.errors.passwordConfirmation}
            />
            <FieldError
              error={form.formState.errors.passwordConfirmation}
              id="password-confirmation-error"
            />
          </div>

          <Button className="mt-2 w-full" loading={isPending} type="submit">
            {t("passwordRecovery.newPassword.submit")}
          </Button>
        </form>
      </div>
    </main>
  );
}
