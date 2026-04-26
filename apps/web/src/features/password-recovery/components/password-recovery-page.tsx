import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router";

import { NewPasswordForm } from "@/features/password-recovery/components/new-password-form";
import { RecoveryRequestForm } from "@/features/password-recovery/components/recovery-request-form";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";
import { usePageTitle } from "@/hooks/use-page-title";

export function PasswordRecoveryPage() {
  const { t } = useTranslation();
  const { isAuthed } = useUserAuth();
  const [searchParams] = useSearchParams();
  const recoveryCode = searchParams.get("recoveryCode");

  usePageTitle(
    recoveryCode ? t("passwordRecovery.newPassword.title") : t("passwordRecovery.request.title"),
  );

  if (isAuthed) {
    return <Navigate replace to="/blogs" />;
  }

  if (recoveryCode) {
    return <NewPasswordForm recoveryCode={recoveryCode} />;
  }

  return <RecoveryRequestForm />;
}
