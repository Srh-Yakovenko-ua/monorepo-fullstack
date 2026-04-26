import type { PasswordRecoveryInput } from "@app/shared";
import type { z } from "zod";

import { PasswordRecoveryInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePasswordRecovery } from "@/features/password-recovery/hooks/use-password-recovery";
import { applyFieldErrors, toastApiError } from "@/lib/api-errors";

type RecoveryRequestFormValues = z.infer<typeof PasswordRecoveryInputSchema>;

export function RecoveryRequestForm() {
  const { t } = useTranslation();
  const recover = usePasswordRecovery();

  const [sentEmail, setSentEmail] = useState<null | string>(null);

  const form = useForm<RecoveryRequestFormValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(PasswordRecoveryInputSchema),
  });

  const isPending = form.formState.isSubmitting;

  async function onSubmit({ email }: PasswordRecoveryInput) {
    try {
      await recover.mutateAsync({ email });
      setSentEmail(email);
      form.reset({ email: "" });
    } catch (err) {
      if (applyFieldErrors(form, err)) return;
      toastApiError(err, t("common.somethingWentWrong"));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in rounded-2xl border border-border/60 bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-md duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
        <div className="mb-6">
          <h1
            className="font-display text-2xl font-normal text-foreground"
            style={{ letterSpacing: "-0.025em" }}
          >
            {t("passwordRecovery.request.title")}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("passwordRecovery.request.subtitle")}
          </p>
        </div>

        {sentEmail && (
          <div
            aria-live="polite"
            className="mb-4 rounded-lg border border-border/60 bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
            role="status"
          >
            {t("passwordRecovery.request.sentBanner", { email: sentEmail })}
          </div>
        )}

        <p className="mb-4 text-sm text-muted-foreground">
          {t("passwordRecovery.request.description")}
        </p>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recovery-email">{t("passwordRecovery.request.emailLabel")}</Label>
            <Input
              id="recovery-email"
              placeholder="email@example.com"
              type="email"
              {...form.register("email")}
              aria-describedby={form.formState.errors.email ? "recovery-email-error" : undefined}
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError error={form.formState.errors.email} id="recovery-email-error" />
          </div>

          <Button className="mt-2 w-full" loading={isPending} type="submit">
            {t("passwordRecovery.request.submit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link className="font-medium text-primary underline underline-offset-2" to="/login">
              {t("passwordRecovery.request.backToSignIn")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
