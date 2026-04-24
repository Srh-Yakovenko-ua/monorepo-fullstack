import { useMutation } from "@tanstack/react-query";

import { registrationApi } from "@/features/registration/api";

export function useResendConfirmation() {
  return useMutation({ mutationFn: registrationApi.resend });
}
