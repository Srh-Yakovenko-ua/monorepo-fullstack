import type { z } from "zod";

import { LoginInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { applyMessageToFields, toastApiError } from "@/lib/api-errors";
import { ApiError } from "@/lib/http-client";

type LoginFormValues = z.infer<typeof LoginInputSchema>;

export function UserLoginPage() {
  const { t } = useTranslation();
  usePageTitle(t("userAuth.login.title"));

  const { isAuthed, signIn } = useUserAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  const form = useForm<LoginFormValues>({
    defaultValues: { loginOrEmail: "", password: "" },
    resolver: zodResolver(LoginInputSchema),
  });

  const isPending = form.formState.isSubmitting;

  if (isAuthed) {
    return <Navigate replace to={nextPath ?? "/blogs"} />;
  }

  async function onSubmit({ loginOrEmail, password }: LoginFormValues) {
    try {
      await signIn({ loginOrEmail, password });
      void navigate(nextPath ?? "/blogs", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const message = t("userAuth.login.invalidCreds");
        applyMessageToFields(form, ["loginOrEmail", "password"], message);
        toast.error(message);
        return;
      }
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
            {t("userAuth.login.title")}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("userAuth.login.subtitle")}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-or-email">{t("userAuth.login.loginOrEmailLabel")}</Label>
            <Input
              id="login-or-email"
              placeholder={t("userAuth.login.loginOrEmailLabel")}
              {...form.register("loginOrEmail")}
              aria-describedby={
                form.formState.errors.loginOrEmail ? "login-or-email-error" : undefined
              }
              aria-invalid={!!form.formState.errors.loginOrEmail}
            />
            <FieldError error={form.formState.errors.loginOrEmail} id="login-or-email-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">{t("userAuth.login.passwordLabel")}</Label>
            <Input
              id="login-password"
              type="password"
              {...form.register("password")}
              aria-describedby={form.formState.errors.password ? "login-password-error" : undefined}
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError error={form.formState.errors.password} id="login-password-error" />
          </div>

          <Button className="mt-2 w-full" loading={isPending} type="submit">
            {t("userAuth.login.submit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              className="font-medium text-primary underline underline-offset-2"
              to="/password-recovery"
            >
              {t("userAuth.login.forgotPassword")}
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground">
            {t("userAuth.login.noAccount")}{" "}
            <Link className="font-medium text-primary underline underline-offset-2" to="/signup">
              {t("userAuth.login.signUpLink")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
