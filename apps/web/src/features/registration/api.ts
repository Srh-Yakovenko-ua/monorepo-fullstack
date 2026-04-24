import type {
  CreateUserInput,
  RegistrationConfirmationInput,
  RegistrationEmailResendingInput,
} from "@app/shared";

import { request } from "@/lib/http-client";

export const registrationApi = {
  confirm: (input: RegistrationConfirmationInput) =>
    request<void>("/api/auth/registration-confirmation", {
      authMode: "none",
      body: JSON.stringify(input),
      method: "POST",
    }),

  register: (input: CreateUserInput) =>
    request<void>("/api/auth/registration", {
      authMode: "none",
      body: JSON.stringify(input),
      method: "POST",
    }),

  resend: (input: RegistrationEmailResendingInput) =>
    request<void>("/api/auth/registration-email-resending", {
      authMode: "none",
      body: JSON.stringify(input),
      method: "POST",
    }),
};
