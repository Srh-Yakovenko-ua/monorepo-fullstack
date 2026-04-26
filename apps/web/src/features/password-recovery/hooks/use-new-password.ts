import { useMutation } from "@tanstack/react-query";

import { passwordRecoveryApi } from "@/features/password-recovery/api";

export function useNewPassword() {
  return useMutation({ mutationFn: passwordRecoveryApi.setNewPassword });
}
