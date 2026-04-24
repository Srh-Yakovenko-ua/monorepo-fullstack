import type { CreateUserInput } from "@app/shared";
import type { z } from "zod";

import { CreateUserInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlreadyRegisteredDialog } from "@/features/registration/components/already-registered-dialog";
import { RegistrationSuccessDialog } from "@/features/registration/components/registration-success-dialog";
import { ResendConfirmationDialog } from "@/features/registration/components/resend-confirmation-dialog";
import { useRegister } from "@/features/registration/hooks/use-register";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { applyFieldErrors, hasFieldError, toastApiError } from "@/lib/api-errors";

type AlreadyRegisteredField = "email" | "login";
type SignupFormValues = z.infer<typeof CreateUserInputSchema>;

export function SignupPage() {
  usePageTitle("Sign up");

  const { t } = useTranslation();
  const { isAuthed } = useUserAuth();
  const register = useRegister();

  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);
  const [alreadyRegisteredField, setAlreadyRegisteredField] =
    useState<AlreadyRegisteredField | null>(null);
  const [resendOpen, setResendOpen] = useState(false);

  const form = useForm<SignupFormValues>({
    defaultValues: { email: "", login: "", password: "" },
    resolver: zodResolver(CreateUserInputSchema),
  });

  const isPending = form.formState.isSubmitting;

  if (isAuthed) {
    return <Navigate replace to="/blogs" />;
  }

  async function onSubmit(values: CreateUserInput) {
    try {
      await register.mutateAsync(values);
      setRegisteredEmail(values.email);
      setRegistrationSucceeded(true);
      setShowSuccess(true);
    } catch (err) {
      if (applyFieldErrors(form, err)) {
        if (hasFieldError(err, "email")) {
          setAlreadyRegisteredField("email");
          return;
        }
        if (hasFieldError(err, "login")) {
          setAlreadyRegisteredField("login");
        }
        return;
      }
      toastApiError(err, t("registration.toasts.generic"));
    }
  }

  function handleSuccessDialogClose() {
    setShowSuccess(false);
  }

  function handleAlreadyRegisteredClose() {
    setAlreadyRegisteredField(null);
  }

  function handleOpenResend() {
    setResendOpen(true);
  }

  const showLinkSentBanner = registrationSucceeded && !showSuccess;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in rounded-2xl border border-border/60 bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-md duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
        <div className="mb-6">
          <h1
            className="font-display text-2xl font-normal text-foreground"
            style={{ letterSpacing: "-0.025em" }}
          >
            {t("registration.signup.title")}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("registration.signup.subtitle")}
          </p>
        </div>

        {showLinkSentBanner && (
          <div className="mb-4 rounded-lg border border-border/60 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Trans
              components={{
                resend: (
                  <button
                    className="cursor-pointer font-medium text-primary underline underline-offset-2"
                    onClick={handleOpenResend}
                    type="button"
                  />
                ),
              }}
              i18nKey="registration.linkSentBanner.text"
            />
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-username">{t("registration.signup.usernameLabel")}</Label>
            <Input
              id="signup-username"
              placeholder="username"
              {...form.register("login")}
              aria-describedby={form.formState.errors.login ? "signup-username-error" : undefined}
              aria-invalid={!!form.formState.errors.login}
            />
            <FieldError error={form.formState.errors.login} id="signup-username-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-email">{t("registration.signup.emailLabel")}</Label>
            <Input
              id="signup-email"
              placeholder="email@example.com"
              type="email"
              {...form.register("email")}
              aria-describedby={form.formState.errors.email ? "signup-email-error" : undefined}
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError error={form.formState.errors.email} id="signup-email-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-password">{t("registration.signup.passwordLabel")}</Label>
            <Input
              id="signup-password"
              type="password"
              {...form.register("password")}
              aria-describedby={
                form.formState.errors.password ? "signup-password-error" : undefined
              }
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError error={form.formState.errors.password} id="signup-password-error" />
          </div>

          <Button className="mt-2 w-full" loading={isPending} type="submit">
            {t("registration.signup.submit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("registration.signup.haveAccount")}{" "}
            <Link className="font-medium text-primary underline underline-offset-2" to="/login">
              {t("registration.signup.signInLink")}
            </Link>
          </p>
        </form>
      </div>

      <RegistrationSuccessDialog
        email={registeredEmail}
        onOpenChange={handleSuccessDialogClose}
        open={showSuccess}
      />

      {alreadyRegisteredField !== null && (
        <AlreadyRegisteredDialog
          field={alreadyRegisteredField}
          onOpenChange={handleAlreadyRegisteredClose}
          open={true}
        />
      )}

      <ResendConfirmationDialog
        initialEmail={registeredEmail}
        onOpenChange={setResendOpen}
        open={resendOpen}
      />
    </main>
  );
}
