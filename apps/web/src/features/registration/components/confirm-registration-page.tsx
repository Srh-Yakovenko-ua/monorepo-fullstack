import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ResendConfirmationDialog } from "@/features/registration/components/resend-confirmation-dialog";
import { useConfirmRegistration } from "@/features/registration/hooks/use-confirm-registration";
import { usePageTitle } from "@/hooks/use-page-title";
import { getErrorMessage } from "@/lib/api-errors";
import { ApiError } from "@/lib/http-client";

type ConfirmationStatus = "already-confirmed" | "expired" | "idle" | "loading" | "success";

const ALREADY_CONFIRMED_MARKER = "already confirmed";

export function ConfirmRegistrationPage() {
  const { t } = useTranslation();
  usePageTitle(t("registration.confirm.loading"));

  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");

  const confirm = useConfirmRegistration();
  const [resendOpen, setResendOpen] = useState(false);

  const status = deriveStatus({ code, confirm });

  const { isError, isPending, isSuccess, mutate: confirmMutate } = confirm;

  useEffect(() => {
    if (!code) {
      toast.error(t("registration.confirm.missingCodeMessage"));
      return;
    }
    if (isPending || isSuccess || isError) return;
    confirmMutate({ code });
  }, [code, confirmMutate, isPending, isSuccess, isError, t]);

  useEffect(() => {
    if (confirm.isError && status !== "already-confirmed") {
      toast.error(getErrorMessage(confirm.error, t("common.somethingWentWrong")));
    }
  }, [confirm.isError, confirm.error, status, t]);

  function handleOpenResend() {
    setResendOpen(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div
        aria-atomic="true"
        aria-live="polite"
        className="w-full max-w-sm animate-in rounded-2xl border border-border/60 bg-card/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-md duration-500 fill-mode-both fade-in slide-in-from-bottom-3"
      >
        {(status === "idle" || status === "loading") && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("registration.confirm.loading")}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-6">
            <p className="font-display text-xl font-normal text-foreground">
              {t("registration.confirm.successTitle")}
            </p>
            <Button asChild>
              <Link to="/login">{t("registration.confirm.signIn")}</Link>
            </Button>
          </div>
        )}

        {status === "already-confirmed" && (
          <div className="flex flex-col items-center gap-6">
            <p className="font-display text-xl font-normal text-foreground">
              {t("registration.confirm.alreadyConfirmedTitle")}
            </p>
            <Button asChild>
              <Link to="/login">{t("registration.confirm.signIn")}</Link>
            </Button>
          </div>
        )}

        {status === "expired" && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-muted-foreground">
              {t("registration.confirm.expiredTitle")}
            </p>
            <Button onClick={handleOpenResend} type="button">
              {t("registration.confirm.resend")}
            </Button>
          </div>
        )}
      </div>

      <ResendConfirmationDialog onOpenChange={setResendOpen} open={resendOpen} />
    </main>
  );
}

function deriveErrorStatus(
  err: unknown,
): Exclude<ConfirmationStatus, "idle" | "loading" | "success"> {
  if (err instanceof ApiError) {
    const matched = err.fieldErrors?.some((fieldError) =>
      fieldError.message.toLowerCase().includes(ALREADY_CONFIRMED_MARKER),
    );
    if (matched) return "already-confirmed";
  }
  return "expired";
}

function deriveStatus({
  code,
  confirm,
}: {
  code: null | string;
  confirm: ReturnType<typeof useConfirmRegistration>;
}): ConfirmationStatus {
  if (!code) return "expired";
  if (confirm.isPending) return "loading";
  if (confirm.isSuccess) return "success";
  if (confirm.isError) return deriveErrorStatus(confirm.error);
  return "idle";
}
