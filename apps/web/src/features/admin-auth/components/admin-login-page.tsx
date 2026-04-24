import type { z } from "zod";

import { LoginInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/features/admin-auth/hooks/use-admin-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { applyMessageToFields, toastApiError } from "@/lib/api-errors";
import { ApiError } from "@/lib/http-client";

type LoginFormValues = z.infer<typeof LoginInputSchema>;

export function AdminLoginPage() {
  const { t } = useTranslation();
  usePageTitle(t("admin.login.title"));

  const { signIn } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  const form = useForm<LoginFormValues>({
    defaultValues: { loginOrEmail: "", password: "" },
    resolver: zodResolver(LoginInputSchema),
  });

  const isPending = form.formState.isSubmitting;

  async function onSubmit({ loginOrEmail, password }: LoginFormValues) {
    try {
      await signIn({ loginOrEmail, password });
      void navigate(nextPath ?? "/users", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const message = t("admin.login.invalidCreds");
        applyMessageToFields(form, ["loginOrEmail", "password"], message);
        toast.error(message);
        return;
      }
      toastApiError(err, t("common.somethingWentWrong"));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in rounded-2xl border border-border/60 bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-md duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
        <div className="mb-6">
          <h1
            className="font-display text-2xl font-normal text-foreground"
            style={{ letterSpacing: "-0.025em" }}
          >
            {t("admin.login.title")}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("admin.login.subtitle")}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-or-email">{t("admin.login.loginLabel")}</Label>
            <Input
              id="login-or-email"
              placeholder="admin"
              {...form.register("loginOrEmail")}
              aria-describedby={
                form.formState.errors.loginOrEmail ? "login-or-email-error" : undefined
              }
              aria-invalid={!!form.formState.errors.loginOrEmail}
            />
            <FieldError error={form.formState.errors.loginOrEmail} id="login-or-email-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">{t("admin.login.passwordLabel")}</Label>
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
            {t("admin.login.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
