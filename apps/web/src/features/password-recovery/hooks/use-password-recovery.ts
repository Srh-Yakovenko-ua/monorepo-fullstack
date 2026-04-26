import { useMutation } from "@tanstack/react-query";

import { passwordRecoveryApi } from "@/features/password-recovery/api";

export function usePasswordRecovery() {
  return useMutation({ mutationFn: passwordRecoveryApi.recover });
}
