import { useMutation } from "@tanstack/react-query";

import { registrationApi } from "@/features/registration/api";

export function useConfirmRegistration() {
  return useMutation({ mutationFn: registrationApi.confirm });
}
