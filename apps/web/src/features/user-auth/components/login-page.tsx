import type { z } from "zod";

import { LoginInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { ApiError } from "@/lib/http-client";

type LoginFormValues = z.infer<typeof LoginInputSchema>;

const INVALID_CREDS_MESSAGE =
  "The password or the email or Username are incorrect. Try again, please";

export function UserLoginPage() {
  usePageTitle("Sign in");

  const { isAuthed, signIn } = useUserAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  const form = useForm<LoginFormValues>({
    defaultValues: { loginOrEmail: "", password: "" },
    resolver: zodResolver(LoginInputSchema),
  });

  const isPending = form.formState.isSubmitting;

  useEffect(() => {
    if (isAuthed) {
      void navigate(nextPath ?? "/blogs", { replace: true });
    }
  }, [isAuthed, navigate, nextPath]);

  async function onSubmit({ loginOrEmail, password }: LoginFormValues) {
    try {
      await signIn({ loginOrEmail, password });
      void navigate(nextPath ?? "/blogs", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        form.setError("loginOrEmail", { message: INVALID_CREDS_MESSAGE });
        form.setError("password", { message: INVALID_CREDS_MESSAGE });
        toast.error(INVALID_CREDS_MESSAGE);
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
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
            Sign in
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Blogger Platform · User account
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-or-email">Email or Username</Label>
            <Input
              id="login-or-email"
              placeholder="Email or Username"
              {...form.register("loginOrEmail")}
              aria-describedby={
                form.formState.errors.loginOrEmail ? "login-or-email-error" : undefined
              }
              aria-invalid={!!form.formState.errors.loginOrEmail}
            />
            <FieldError error={form.formState.errors.loginOrEmail} id="login-or-email-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              {...form.register("password")}
              aria-describedby={form.formState.errors.password ? "login-password-error" : undefined}
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError error={form.formState.errors.password} id="login-password-error" />
          </div>

          <Button className="mt-2 w-full" disabled={isPending} type="submit">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
