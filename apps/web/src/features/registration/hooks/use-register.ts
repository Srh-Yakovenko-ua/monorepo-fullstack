import { useMutation } from "@tanstack/react-query";

import { registrationApi } from "@/features/registration/api";

export function useRegister() {
  return useMutation({ mutationFn: registrationApi.register });
}
